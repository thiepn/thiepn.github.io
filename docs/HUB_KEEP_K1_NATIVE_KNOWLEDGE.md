# Hub KEEP native integration K1

- Actual Hub Knowledge route /home/knowledge/ uses the existing persistent Hub WorkspaceShell, native note writer and account-scoped WorkspaceStore CAS.
- Editing/creating notes and creating tasks with an explicit stable original note reference work inside Hub, without an iframe or external application navigation.
- KEEP B3 source ZIP inspected: its original KeepNotesDB and encryption are independent. **The full KEEP B3 editor is not imported, mounted or synchronized in K1.** This is an honest incremental integration, not a complete KEEP port.
- KEEP B3 inspired the unique-title and stable-ID Wikilink resolution; current K1 operates ONLY on the native Hub notes and tasks without duplicate stores.
- Folio/Vault/Notes retain original ownership and no records are copied, no encryption is bypassed, and no migrations or provider writes are attempted.
- Later batch requires the KEEP repository/package and real owner-authorized adapters before full KEEP note editing in Hub.
- User input saved by existing Hub writer and validated by original parseState; encrypted KEEP records, cross-app provider records and remote calendar writes are not writable from this route.
