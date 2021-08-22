/**
 * This community connector is a proof of concept.
 * It pulls data from a Google Sheet but only grants
 * access to each record to those users whose Google emails
 * are declared in an access control list (ACL) field with
 * multiple comma-separated emails.
 * 
 * V4 uses:
 * - A service a account to access the underlying spreadsheet, thus neglecting
 *   the need to share it with the viewer (anyone with the link can view), credentials
 *   are obtained using USER_PASS auth.
 * - A secondary sheet in the spreadsheet that acts as a group ACL.
 * - Domain-based filtering, additionally to emails and groups.
 * - Stepped config for the user to choose ID, Data / ACL sheets and ACL column in data sheet.
 * 
 * CC structure based on this codelab: https://developers.google.com/datastudio/connector/get-started
 * 
 * Copyright (C) Pablo Felip (@pfelipm) · Distibuted under the MIT license.
 */

const cc = DataStudioApp.createCommunityConnector();

/**
 * CC's auth type
 */
function getAuthType() {
  
  // Set auth type
  const AuthTypes = cc.AuthType;
  return cc
    .newAuthTypeResponse()
    .setAuthType(AuthTypes.USER_PASS)
    .build();
}

/**
 * More functions required by AuthType USER_PASS
 */

function isAuthValid() {

  // Check if we can login into service account, this is also called once before first authorization request
  const {saEmail, saPrivateKey} = getCredentialsFromProperties();

  if (saEmail && saPrivateKey) {
    const service = getOauthService(saEmail, saPrivateKey);
    return service.hasAccess();
  } else {
    return false;
  }
}

function resetAuth() {
  
  // Forget credentials for service account access
  PropertiesService.getScriptProperties()
    .deleteProperty('saEmail')
    .deleteProperty('saPrivateKey');
}

function setCredentials(request) {

  // If valid, store credentials for service account provided by the user inside script properties >> cache would be very welcome!
  const saEmail = request.userPass.username;
  const saPrivateKey = request.userPass.password.replace(/\\n/g,'\n');
  const service = getOauthService(saEmail, saPrivateKey);
  
  if (service.hasAccess()) {
    PropertiesService.getScriptProperties()
      .setProperty('saEmail', saEmail)
      .setProperty('saPrivateKey', saPrivateKey);
    return {errorCode: 'NONE'}
  } else {
    return {errorCode: 'INVALID_CREDENTIALS'};
  }
}

function getCredentialsFromProperties() {
  
  // Helper function, returns an object with the service account credentials

  return {
            saEmail: PropertiesService.getScriptProperties().getProperty('saEmail'),
            saPrivateKey: PropertiesService.getScriptProperties().getProperty('saPrivateKey')
          };
}

/**
 * CC's setup
 */
function getConfig(request) {
  
  // Initialization
  const config = cc.getConfig();
  const configParams = request.configParams;
  config.setIsSteppedConfig(true);
  let stage = 1;

  // Instructions
  config.newInfo()
    .setId('settings')
    .setText('Connector settings (reload page to start over)');

  // Spreadsheet's ID
  config.newTextInput()
    .setId('id')
    .setName('ID')
    .setHelpText('Google spreadsheet ID.')
    .setPlaceholder('e.g.: 1kSrlo...')
    .setIsDynamic(true);
  
  if (configParams) {

    // We already have a request.configParam object and some ID, now in ### stage 2+ ###
    stage = 2;

    const {saEmail, saPrivateKey} = getCredentialsFromProperties();
    const sheetNames = getSheetsApi(configParams.id, saEmail, saPrivateKey);

    if (sheetNames.length == 0) {
      console.info('error')
      cc.newUserError()
        .setDebugText('Error at configuration stage 2.')
        .setText(`⚠️ No sheets found in spreadsheet with ID '${configParams.id}', please start over and check ID.`)
        .throwException();  
    }

    // Data range of ACL table
    config.newTextInput()
      .setId('aclTableRange')
      .setName('Range of ACL table [optional]')
      .setHelpText('Input range of ACL table, EXCLUDING sheet name, headers at row 1 >> name of groups / rest of rows >> user emails (all cells selected if blank).')
      .setPlaceholder('e.g.: A1:C10');
    
    // Data range
    config.newTextInput()
      .setId('range')
      .setName('Range of dataset [optional]')
      .setHelpText('Input range to pull data from, EXCLUDING sheet name (all cells selected if blank).')
      .setPlaceholder('e.g.: A1:J100');

    // ACL sheet
    const aclSheetSelector = config.newSelectSingle()
      .setId('aclSheetName')
      .setName('ACL table sheet')
      .setHelpText('Choose the sheet that contains the ACL table, headers at row 1 >> name of groups / rest of rows >> user emails.');
    sheetNames.sort().forEach(sn => aclSheetSelector.addOption(config.newOptionBuilder().setLabel(sn).setValue(sn)));
    
    // Data sheet
    const dataSheetSelector = config.newSelectSingle()
      .setId('dataSheetName')
      .setName('Data sheet')
      .setHelpText('Choose the sheet that contains the dataset.')
      .setIsDynamic(true);
    sheetNames.forEach(sn => dataSheetSelector.addOption(config.newOptionBuilder().setLabel(sn).setValue(sn)));
    
    if (configParams.dataSheetName && configParams.aclSheetName) {

      // We have everything but the ACL header, now in ### stage 3 ###
      stage = 3;

      // Get headers from dataset, append range, if exists (not blank), to sheet name
      const data = readDataApi(configParams.id,     
                               !configParams.range ? configParams.dataSheetName : configParams.dataSheetName + '!' + configParams.range,
                               saEmail,
                               saPrivateKey);
      if (data.length == 0) {
        console.info('error')
        cc.newUserError()
          .setDebugText('Error at configuration stage 3.')
          .setText(`⚠️ Error retrieving headers of sheet '${configParams.dataSheetName}' in spreadsheet with ID '${configParams.id}', please start over and check ID and source sheet.`)
          .throwException();  
      }

      // Header of ACL column
      const aclColumnSelector = config.newSelectSingle()
        .setId('acl')
        .setName('Label in header of ACL column')
        .setHelpText('Choose ACL column, must contain a comma-separated list of Google emails and/or security groups.');
      data.shift()
        .filter(h => h != '')
        .forEach(h => aclColumnSelector.addOption(config.newOptionBuilder().setLabel(h).setValue(h)));

      config.setIsSteppedConfig(false);
    }
  }

  // Progress bar
  config.newInfo()
    .setId('progressbar')
    .setText(`[${stage}/3] ${'●'.repeat(stage * 3)}${'○'.repeat(9 - stage * 3)}`);

  return config.build();
}

/**
 * CC's schema
 */
function getSchema(request) {

  let fields =  getFields(request);
  fields = cc.newGetSchemaResponse().setFields(fields).build();

  return fields;
}

/**
 * CC's fields
 */
function getFields(request) {

  const fields = cc.getFields();
  const types = cc.FieldType;
  const {saEmail, saPrivateKey} = getCredentialsFromProperties();

  // Get headers from dataset, append range, if exists (not blank), to sheet name
  const data = readDataApi(request.configParams.id,
                           !request.configParams.range ? request.configParams.dataSheetName : request.configParams.dataSheetName + '!' + request.configParams.range,
                           saEmail,
                           saPrivateKey);
  if (data.length == 0) {
    console.info('error')
    cc.newUserError()
      .setDebugText(`Error at getSchema() > getFiels(): ${e}`)
      .setText(`⚠️ Could not retrieve data schema of sheet '${request.configParams.dataSheetName}' in spreadsheet with ID '${request.configParams.id}'.`)
      .throwException();  
  }
  
  data.shift()
    .filter(h => h != '')
    .forEach(h => {
      fields.newDimension()
        .setId(h.toLowerCase().replace(/ /g, '')) // Special characters should also be removed!
        .setName(h)
        .setType(types.TEXT); // All fields set as text
    });
  
  return fields;
}

/**
 * Pull data from spreadsheet
 */
function getData(request) {

  // Identify requested fields
  const requestedFieldIds = request.fields.map(f => f.name);
  const requestedFields = getFields(request).forIds(requestedFieldIds);
  
  // Get service account credentials from Properties store
  const {saEmail, saPrivateKey} = getCredentialsFromProperties();

  // Read data & ACL table from spreadsheet
  let interval, headers, records, aclTable;
  try {
    interval = readDataApi(request.configParams.id,     
                           !request.configParams.range ? request.configParams.dataSheetName : request.configParams.dataSheetName + '!' + request.configParams.range,
                           saEmail,
                           saPrivateKey);

    aclTable = readDataApi(request.configParams.id,     
                           !request.configParams.aclTableRange ? request.configParams.aclSheetName : request.configParams.aclSheetName + '!' + request.configParams.aclTableRange,
                           saEmail,
                           saPrivateKey);
  } catch(e) {
    cc.newUserError()
      .setDebugText(`Error at getData(): ${e}`)
      .setText(`⚠️ Could not connect with spreadsheet with ID '${request.configParams.id}'`)
      .throwException();
  }
  [headers, ...records] = interval;
  [headersAclT, ...recordsAclT] = aclTable;

  // Convert headers of dataset to lowercase and remove spaces to match with requested fields by ID
  headers = headers.map(h => h.toLowerCase().replace(/ /g, ''));
  
  // Convert headers of groups in ACT table to lowercase
  headersAclT = headersAclT.map(h => h.toLowerCase());

  // Add columns to rows with fewer elements than columns in the ACL table
  aclTable.shift().forEach(r => {
    for (let i = 1; i <= headers.length - r.length; i++) r.push('');
  });

  // Add columns to rows with fewer elements than columns in the dataset
  recordsAclT.forEach(r => {
    for (let i = 1; i <= headersAclT.length - r.length; i++) r.push('');
  });

  // Get requested fields and prepare data response
  const data = cc.newGetDataResponse().setFields(requestedFields);
  const fieldIndexes = requestedFields.asArray().map(f => f.getId()).map(f => headers.indexOf(f));

  // Check viewer's email against ACL
  const aclCol = headers.indexOf(request.configParams.acl.toLowerCase().replace(/ /g, '')); // Remove spaces to match with headers
  const viewerEmail = Session.getEffectiveUser().getEmail();
  records.forEach(r => {
    const row = fieldIndexes.map(f => r[f]);
    const allowedUsers = r[aclCol].toLowerCase().split(",").map(aclItem => aclItem.trim());
    if (allowedUsers.some(aclItem => {
      let grantAccess = false;

     // Public access?
      if (aclItem == '*') {
        grantAccess = true;
      }

      // aclItem seems to be an email, check if there is an email match
      if (aclItem.includes('@')) {
        grantAccess = aclItem == viewerEmail;
      }
      
      // aclItem seems to be a domain, check against the viewer's domain
      else if (aclItem.match(/^[^@]+\..+/)) {
        grantAccess = aclItem == viewerEmail.substring(viewerEmail.lastIndexOf('@') + 1);
      }

      // aclItem has to be a group, check if email belongs to it
      else {
        const groupCol = headersAclT.indexOf(aclItem);
        if (groupCol != -1) {
          grantAccess = recordsAclT.some(row => row[groupCol].toLowerCase() == viewerEmail);
        }
      }
      return grantAccess;
    })) {data.addRow(row);}
  });

  return data.build();
}

/**
 * Pull data from a range of cells in a given Google spreadsheet using Sheets API
 * using the specified service account
 * @param   {string}   id       ID of spreadsheet
 * @param   {string}   range    Range of cells, including sheet
 * @param   {string}   saEmail  Service account's email
 * @param   {string}   saKey    Service account's private key
 * @return  {Array}             Range contents (or empty array if error)
 */
function readDataApi(id, range, saEmail, saKey) {

  const service = getOauthService(saEmail, saKey);
  // service.reset();
  if (service.hasAccess()) {
    const data =UrlFetchApp.fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?majorDimension=ROWS`,
      {
          headers: {Authorization: 'Bearer ' + service.getAccessToken()},
          method: 'get',
          muteHttpExceptions: true
      });

    if (data.getResponseCode() == 200) {
      return JSON.parse(data.getContentText()).values;
    } else {
      return [];
    }

  } else {
    console.info(service.getLastError());
    return [];
  }
}

/** 
 * Returns the sheets inside a given spreadsheets
 * @param  {string}   id       ID of spreadsheet
 * @param  {string}   saEmail  Service account's email
 * @param  {string}   saKey    Service account's private key
 * @return {string[]}          Names of available sheets (or empty array if error)
 */
function getSheetsApi(id, saEmail, saKey) {

  const service = getOauthService(saEmail, saKey);
  // service.reset();
  if (service.hasAccess()) {
    const data =UrlFetchApp.fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}?includeGridData=false`,
      {
          headers: {Authorization: 'Bearer ' + service.getAccessToken()},
          method: 'get',
          muteHttpExceptions: true
      });

    if (data.getResponseCode() == 200) {
      return JSON.parse(data.getContentText()).sheets.map(s => s.properties.title);
    } else {
      return [];
    } 

  } else {
    console.info(service.getLastError());
    return [];
  }
}

/**
 * Oauth into a given service account with read-only access to spreadsheets
 * @param {string} saEmail  Email of service account
 * @param {string} saKey    Private key of service account
 */
function getOauthService(saEmail, saKey) {

  return OAuth2.createService('sheets')
    .setTokenUrl('https://accounts.google.com/o/oauth2/token')
    .setPrivateKey(saKey)
    .setIssuer(saEmail)
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setCache(CacheService.getScriptCache())
    .setScope('https://www.googleapis.com/auth/spreadsheets.readonly');
}

function isAdminUser() {
  return true;
}