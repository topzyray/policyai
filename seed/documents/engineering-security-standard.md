# Engineering Security Standard

This internal standard is for Engineering. It describes how services store credentials and how incidents are reported.

ENG_SECURITY_INTERNAL_1904

Production secrets live in the approved secret manager. They are not committed to git and not pasted into PolicyAI prompts. A lost laptop is reported to Security within one hour. Customer data exports require a ticket and a second engineer.

Dependencies with a critical advisory are patched or mitigated within seven days. The service owner records the exception if a patch must wait.
