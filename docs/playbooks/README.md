# County Playbooks

This directory contains playbooks for counties that require semi-automated (Level B) data extraction.

## Playbook Structure

Each playbook documents the manual steps to extract data from a county portal, with the goal of eventually automating those steps.

## Status Legend

- ✅ **Automated**: Scraper implemented
- 📋 **Playbook**: Documented, ready for automation
- 🔧 **Draft**: Initial documentation
- ❌ **Not Automatable**: Level C (manual only)

## Counties

| County | Source | Status | Automation Level | Playbook |
|--------|--------|--------|------------------|----------|
| Utah | Recorder | ✅ Automated | Level A | [utah-recorder.md](./utah-recorder.md) |
| Davis | Property Search | 📋 Playbook | Level B | [davis-property-search.md](./davis-property-search.md) |
| Davis | Recorder | 📋 Playbook | Level B | [davis-recorder.md](./davis-recorder.md) |
| Weber | Recorder | 📋 Playbook | Level B | [weber-recorder.md](./weber-recorder.md) |
| Salt Lake | Recorder | 📋 Playbook | Level B | [salt-lake-recorder.md](./salt-lake-recorder.md) |
| Tooele | Recorder | 📋 Playbook | Level B | [tooele-recorder.md](./tooele-recorder.md) |
| Rich | None | ❌ Not Automatable | Level C | — |

## Template

See [TEMPLATE.md](./TEMPLATE.md) for creating new playbooks.

## Implementation Priority

1. **Utah County Recorder** (Level A) - DONE
2. **Davis Property Search** (Level B) - High priority (22 properties)
3. **Weber GIS Portal** (Level B) - High priority (69 properties)
4. **Salt Lake Recorder** (Level B) - Medium priority
5. **Tooele Assessor** (Level B) - Low priority (already 82% complete)
