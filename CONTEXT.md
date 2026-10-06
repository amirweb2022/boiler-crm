# Boiler Inspection CRM

This system tracks recurring inspections of steam boilers and pressure vessels for companies.

## Language

**Inspection cycle**:
One company's scheduled inspection period, ending when its eligible vessels have been accounted for and its certificate has been uploaded. A new cycle begins with the next Jalali-year due date.

**Current certificate**:
An uploaded certificate belonging to the active inspection cycle. A certificate from an earlier cycle does not satisfy the active cycle's completion requirement.

**Historical certificate**:
The retained certificate of a completed inspection cycle, available to an administrator after rollover. It is not a current certificate and remains available even when the next cycle approaches its due date.

**Reminder window**:
The eligible days before an inspection due date during which one reminder may be accepted by the SMS provider. A reminder is never initiated outside 08:00–20:00 Asia/Tehran or on/after the due date.
