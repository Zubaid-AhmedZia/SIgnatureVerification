# SIgnatureVerification

Problem : Airdrop to user using record stored on backend database. Smart contract claim function will be called by user with amount but we need admin signature to prevent overclaimimg. 

Solution : Using EIP‑712 to sign structured data by admin and pass the signature as parameter to claim function that will recover and verify the signature.

I will ad nonce and deadline for making it more secure. 
