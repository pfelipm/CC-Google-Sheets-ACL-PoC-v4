![](https://user-images.githubusercontent.com/12829262/130348347-2d9c0abe-9886-4025-b0d4-c69cc9910a79.png)  
[![Created with - Google Apps Script](https://img.shields.io/static/v1?label=Created+with&message=Google+Apps+Script&color=blue)](https://developers.google.com/apps-script)

# CC-Google-Sheets-ACP-PoC-v4

Proof of concept of a community connector for Google Data Studio that offers a more advanced form of row-level security than the built-in filter by email in the data source. Some features:

*   Access control list is built into the underlying spreadsheet dataset and supports any comma-separated combination of email addresses, groups, full domains and a wildcard \[ \* \] that makes records public.
*   Uses a service account to access the underlying dataset with `AuthTypes.USER_PASS`.
*   [Stepped configuration](https://developers.google.com/datastudio/connector/stepped-configuration)

<table><tbody><tr><td><figure class="image"><img src="https://user-images.githubusercontent.com/12829262/130349603-fd5579e0-df67-4578-b2e7-21bccfa73ca7.png"></figure></td><td><figure class="image"><img src="https://user-images.githubusercontent.com/12829262/130349588-b5c5d4c8-c1f6-4d74-ad54-f514ead3186b.png"></figure></td></tr></tbody></table>

https://user-images.githubusercontent.com/12829262/130348853-06ba6a91-2621-4d2e-87ad-94da60136e28.mp4

This is the final version of the community connector proposed in my post 👉 [Using community connectors to go beyond filter by email in Data Studio](https://pablofelip.online/community-connectors-beyond-filter-email-data-studio).

![](https://user-images.githubusercontent.com/12829262/131015112-b1cabe46-0459-4445-8ce3-69298e877d5a.png)
