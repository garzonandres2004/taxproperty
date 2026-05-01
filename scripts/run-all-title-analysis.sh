#!/bin/bash
echo "Running title analysis on all properties..."

PROPERTY_IDS=$(sqlite3 /Users/andres/Desktop/claude-projects/taxtpropertyidea/taxproperty-utah/prisma/dev.db \
"SELECT id FROM Property WHERE is_seed = 0 ORDER BY final_score DESC;")

TOTAL=$(echo "$PROPERTY_IDS" | wc -l | tr -d ' ')
COUNT=0

for ID in $PROPERTY_IDS; do
  COUNT=$((COUNT + 1))
  PARCEL=$(sqlite3 /Users/andres/Desktop/claude-projects/taxtpropertyidea/taxproperty-utah/prisma/dev.db \
  "SELECT parcel_number FROM Property WHERE id = '$ID';")
  echo "[$COUNT/$TOTAL] Analyzing $PARCEL..."
  curl -s -X POST "http://localhost:3000/api/properties/$ID/title-analysis" > /dev/null
  sleep 0.8  # Rate limit - be respectful to Utah County servers
done

echo ""
echo "Complete! Summary:"
sqlite3 /Users/andres/Desktop/claude-projects/taxtpropertyidea/taxproperty-utah/prisma/dev.db \
"SELECT
  CASE
    WHEN t.score >= 80 THEN 'CLEAN (80-100)'
    WHEN t.score >= 60 THEN 'CAUTION (60-79)'
    WHEN t.score >= 40 THEN 'DANGER (40-59)'
    ELSE 'AVOID (0-39)'
  END as title_status,
  COUNT(*) as count
FROM TitleAnalysis t
GROUP BY title_status
ORDER BY MIN(t.score) DESC;"
