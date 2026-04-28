---
Generate the investor demo report.
1. Get all properties with recommendation='bid': 
   sqlite3 prisma/dev.db "SELECT id FROM Property WHERE recommendation='bid' ORDER BY final_score DESC"
2. Open /reports?ids=<comma-separated-ids> in the browser
3. Confirm the report loaded correctly
---
