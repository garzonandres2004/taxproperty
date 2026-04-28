#!/usr/bin/env python3
import json, sys

data = json.load(sys.stdin)
print(f'Properties loaded: {len(data)}')
print()

# Solo candidates
solo = [p for p in data if p.get('total_amount_due') and p['total_amount_due'] < 5000 and p.get('final_score') and p['final_score'] > 40]
solo.sort(key=lambda x: x.get('final_score') or 0, reverse=True)

print(f'Solo bid candidates (payoff < $5k, score > 40): {len(solo)}')
print()
print('=== TOP 10 SOLO BID CANDIDATES ===')
print(f"{'Serial':<15} {'Score':<6} {'Market Value':<14} {'Payoff':<12} {'Ratio':<7} {'Owner':<30}")
print('-' * 100)
for p in solo[:10]:
    ratio = p['total_amount_due'] / p['estimated_market_value'] * 100 if p.get('estimated_market_value') else 0
    owner = (p.get('owner_name') or 'N/A')[:28]
    print(f"{p['parcel_number']:<15} {p['final_score']:<6} ${p['estimated_market_value']:>12,.0f} ${p['total_amount_due']:>10,.2f} {ratio:>6.1f}% {owner:<30}")

print()
print('=== STATS ===')
print(f"High scores (>80): {sum(1 for p in data if p.get('final_score') and p['final_score'] > 80)}")
print(f"Individual owners: {sum(1 for p in data if p.get('owner_name') and 'LLC' not in p['owner_name'].upper())}")
print(f"LLC owners: {sum(1 for p in data if p.get('owner_name') and 'LLC' in p['owner_name'].upper())}")
