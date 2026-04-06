# The Data Zipper

Transform and merge your property data with skip-traced phone numbers for Outbound IQ.

## Live Demo

Once deployed, access the app at: `https://data-zipper.vercel.app`

## Features

- 📊 Upload Raw Data (CSV or Excel files)
- 📱 Upload BatchData Phone File (CSV)
- 🔄 Dynamic Column Mapping (saved automatically in your browser)
- 📞 Smart Phone Prioritization (Mobile numbers first, then landlines)
- 📧 Email extraction from BatchData
- 🏠 Complete address building (or use pre-built SitusFullStreetAddress)
- 🔍 Optional filtering (Equals, Contains, Does Not Equal, etc.)
- 📥 One-click export to Outbound IQ format

## Output Format

The app produces a CSV with these 16 columns:

| Column | Description |
|--------|-------------|
| First Name | From raw data |
| Last Name | From raw data |
| Address | Built from components or pre-built |
| City | From raw data |
| State | From raw data |
| Zip | From raw data |
| Phone 1 | Best mobile number (formatted) |
| Email | From BatchData |
| Phone 2 | Same as Phone 1 (for SMS) |
| DOB | Date of Birth (if available) |
| FICO | Credit score (if available) |
| Loan Bal | Loan amount (if available) |
| Estimated | Estimated property value (if available) |
| Loan Type | Loan type code (if available) |
| Sep | Empty placeholder |
| sms_v1.xml | Empty placeholder |

Phone numbers are formatted as `(XXX) XXX-XXXX`.

## How to Use

1. **Upload Files** - Select your Raw Data file and BatchData phone file
2. **Map Columns** - Use dropdowns to match your columns to the required fields (saved automatically)
3. **Filter (Optional)** - Add a simple rule like "State = CA" or "Zip = 90210"
4. **Process & Download** - Click the button and your CSV downloads instantly

## Privacy

100% client-side. Your data never leaves your computer. No backend, no database, no API calls.

## Tech Stack

- Next.js 15 (React)
- TypeScript
- PapaParse (CSV parsing)
- SheetJS (Excel parsing)

## Development

To run locally:

```bash
npm install
npm run dev