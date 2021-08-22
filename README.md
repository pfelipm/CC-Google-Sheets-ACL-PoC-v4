![](https://user-images.githubusercontent.com/12829262/130348347-2d9c0abe-9886-4025-b0d4-c69cc9910a79.png)

# CC-Google-Sheets-ACP-PoC-v4

Proof of concept of a community connector for Google Data Studio that offers a more advanced form of row-level security than the built-in filter by email in the data source. Some features:

*   Access control list is built into the underlying spreadsheet dataset and supports any comma-separated combination of email addresses, groups, full domains and a wildcard \[ \* \] that makes records public.
*   Uses a service account to access the underlying dataset with `AuthTypes.USER_PASS`.
*   [Stepped configuration](https://developers.google.com/datastudio/connector/stepped-configuration)

![](https://user-images.githubusercontent.com/12829262/130348616-c56a50f5-decb-4e8c-8792-96a7ad839086.png)

This is the final versión of the community connector proposed in Using community connectors to go beyond filter by email in Data Studio.
