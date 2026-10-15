# Boiler Inspection CRM

This system tracks recurring inspections of company equipment and the certificates that document each inspection cycle.

## Language

**Inspection device**:
A tank, boiler, lift, forklift, or grounding system tracked as one unit in a company's inspection cycle.
_Avoid_: Vessel when referring to all supported equipment categories

**Device details**:
The type-specific descriptive information recorded for an inspection device. Tanks and boilers use a name and volume; lifts, forklifts, and grounding systems have their own details.
_Avoid_: Vessel metadata

**Inspection cycle**:
One company's scheduled inspection period, ending when its eligible inspection devices have been accounted for and its certificate has been uploaded. A new cycle begins with the next Jalali-year due date.

**Current certificate**:
An uploaded certificate belonging to the active inspection cycle. A certificate from an earlier cycle does not satisfy the active cycle's completion requirement.

**Historical certificate**:
The retained certificate of a completed inspection cycle. It is not a current certificate and remains available even when the next cycle approaches its due date.

**Certificate share link**:
An unlisted link granting its holder access to one certificate without an account or an active session. Sharing the link grants another person the same access.

**Reminder window**:
The two Tehran calendar days before an inspection due date during which an administrator can manually send a reminder SMS. Sending is allowed only from 08:00 inclusive until 22:00 exclusive Asia/Tehran time. One provider-accepted reminder is allowed per test date; a failed attempt can be retried.

**Monthly inspection report**:
A workbook summarizing inspection devices tested in one Jalali month, with separate sheets for each equipment type.
