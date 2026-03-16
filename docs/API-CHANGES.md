# API params vs zap2xml and canonical URL

This app targets the **current** Gracenote tvlistings grid API. The canonical working URL (from browser) is:

```
https://tvlistings.gracenote.com/api/grid?lineupId=CAN-lineupId-DEFAULT&timespan=3&headendId=lineupId&country=CAN&timezone=&device=-&postalCode=A1A1A1&isOverride=true&time=1773671400&pref=16%2C128&userId=-&aid=orbebb&languagecode=en-us
```

## Query parameters (all configurable)

| Param       | Example              | Notes                          |
|------------|----------------------|--------------------------------|
| lineupId   | CAN-lineupId-DEFAULT | Replace with your lineup       |
| timespan   | 3                    | Hours per request (e.g. 3 or 6)|
| headendId  | lineupId             | Often same as lineup fragment  |
| country    | CAN                  | USA or CAN                     |
| timezone   | (empty)              | Optional                       |
| device     | -                    | Or X for some lineups          |
| postalCode | A1A1A1               | Your postal/zip                |
| isOverride | true                 |                                |
| time       | (Unix sec)           | Start of requested window      |
| pref       | 16,128               | Encoded as 16%2C128            |
| userId     | -                    |                                |
| aid        | orbebb               | Affiliate id                   |
| languagecode | en-us              |                                |

## Differences from zap2xml

- **URL:** Same base `https://tvlistings.gracenote.com/api/grid`. No `FromPage`, `TMSID`, or `AffiliateID` in the canonical URL; we use only the params above.
- **pref:** Value is sent as-is (e.g. `16,128`); URL encoding produces `16%2C128`. zap2xml sometimes appends `16,128` to a separate pref; we use a single `pref` field.
- **device:** Canonical uses `-`; zap2xml often uses `X` for OTA. Both are supported via config.
- **languagecode:** Explicit param here; zap2xml may omit it in some builds.

All parameters are configurable via `config.json`, env vars, or the web UI.
