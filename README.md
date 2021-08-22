![](https://user-images.githubusercontent.com/12829262/130348347-2d9c0abe-9886-4025-b0d4-c69cc9910a79.png)

![](https://user-images.githubusercontent.com/12829262/130349414-83324083-3946-4b01-b471-2b8d0de68531.png)

# CC-Google-Sheets-ACP-PoC-v4

Proof of concept of a community connector for Google Data Studio that offers a more advanced form of row-level security than the built-in filter by email in the data source. Some features:

*   Access control list is built into the underlying spreadsheet dataset and supports any comma-separated combination of email addresses, groups, full domains and a wildcard \[ \* \] that makes records public.
*   Uses a service account to access the underlying dataset with `AuthTypes.USER_PASS`.
*   [Stepped configuration](https://developers.google.com/datastudio/connector/stepped-configuration)

![](https://user-images.githubusercontent.com/12829262/130348616-c56a50f5-decb-4e8c-8792-96a7ad839086.png)

![](https://user-images.githubusercontent.com/12829262/130349299-71de1eef-dbbb-4867-b958-0719e6a81aae.png)

https://user-images.githubusercontent.com/12829262/130348853-06ba6a91-2621-4d2e-87ad-94da60136e28.mp4

This is the final versión of the community connector proposed in Using community connectors to go beyond filter by email in Data Studio.
