# preparedatabetter
For prepare data test for better app.
This link >> https://surachetjurakurd-png.github.io/preparedatabetter/Main_Menu.html

## Update Summary (2026-08-07) : On version 0.7

Summary of all updates completed today.

### 1) Facial (base64) Input Sanitization
- Prevented whitespace in `Facial (base64)` fields.
- Sanitization now removes spaces, tabs, and line breaks while typing or pasting.
- Added enforcement again before request payload generation to avoid invalid base64 being sent.

Updated files:
- Create_Customer_SIT_Thai_IAL23.html
- Create_Customer_SIT_Foreigner.html
- KKP_Channel_Verification.html

### 2) Editable `myPin` in Customer Data
- Added `MyPin (6 digits)` input to `Customer Data`.
- Users can now define `myPin` manually instead of using a fixed value.
- Input accepts numbers only and is limited to 6 digits.
- Step 3 request preview and actual payload now use the entered `myPin`.
- Added validation to block Step 3 if `myPin` is not exactly 6 digits.

Updated files:
- Create_Customer_SIT_Thai_IAL23.html
- Create_Customer_SIT_Thai_IAL13.html
- Create_Customer_SIT_Thai_IAL21.html

### 3) Sequential `Send all requests` Buttons
- Added automation buttons to run API steps in sequence and stop immediately on failure.
- Added a summary response panel for the batch execution result.

#### Create_Customer_SIT_Thai_IAL23.html
- Added `Send all requests (customer with a PIN)` for Step `1 → 2 → 3 → 6`
- Added `Send all requests (customer without a PIN)` / `All Send Request (Step 1→2→6)` for Step `1 → 2 → 6`
- Moved the all-send controls to the top-right of `🔄 API Steps & Requests`
- Styled the no-PIN button in yellow

#### Create_Customer_SIT_Thai_IAL13.html
- Added `Send all requests (Step 1→2→3→4)`
- Added yellow `All Send Request (Step 1→2→4)`

#### Create_Customer_SIT_Thai_IAL21.html
- Added `Send all requests (Step 1→2→3→4)`
- Added yellow `All Send Request (Step 1→2→4)`

### 4) Version Alignment
- Updated project pages to `Version 0.7`
- Updated this README summary to reflect all changes delivered in version `0.7`

-----------------------------------------------------------------------------------------------------------

## Update Summary (2026-07-24) 13:46 : On version 0.6

Summary of all updates completed today.

### 1) Section and Arrow Behavior Standardization
- Standardized arrow behavior across pages:
	- Collapse = ▶
	- Expand = ▼ (with smooth rotation via `transition`)
- Added a `locked` pattern for sections that users should not expand.
- Locked sections remain `collapsed` and cannot be expanded.
- Updated hover behavior for locked sections so they do not look clickable.

### 2) Files Aligned to the Shared Standard
- Create_Customer_SIT_Thai_IAL23.html
- Create_Customer_SIT_Thai_IAL21.html
- Create_Customer_SIT_Thai_IAL13.html
- Create_Customer_SIT_Foreigner.html
- KKP_Channel_Verification.html

Main updates:
- Locked `⚙️ Environment Configuration` to prevent expand.
- Synced section/step arrows with actual state.
- Improved arrow transitions with smoother rotation.

### 3) Files with Fields Moved to `⚙️ Environment Configuration`

#### Get_Customer_Image_Viewer.html
- Moved fields:
	- Reference No
	- Endpoint (Get customer image)
	- Proxy Base URL
- Created `⚙️ Environment Configuration` as Section 2.
- Set this section to collapsed + locked.
- Reduced Thai Citizen ID field width for a more balanced layout.

#### Get_Customer_Profile_By_AccountNo.html
- Moved fields:
	- Account Type
	- Active Flag
	- url ACS
	- Proxy Base URL
- Created `⚙️ Environment Configuration` as Section 2.
- Set this section to collapsed + locked.
- Reduced Account Number field width for a more balanced layout.
- Locked API Request Preview (no expand).

#### Get_Account_From_CID.html
- Moved fields:
	- Reference No
	- cifNo from Step 1
	- url CDF GetCustomerInfo
	- url ACS
	- Proxy Base URL
- Created `⚙️ Environment Configuration` as Section 2.
- Set this section to collapsed + locked.
- Standardized API Request Preview arrow behavior.
- Changed Raw Response default background to neutral (not green).
- Reduced Customer ID (CID) field width for a more balanced layout.

### 4) Files with Specifically Locked Sections
- Remove_Device_Better_App.html
	- Locked Request Input
	- Locked cURL Preview

- Transfer_Money_ATS_SG.html
	- Locked Request Input
	- Locked cURL Preview

- Cancel_State_For_Onboarding.html
	- Locked SQL Query Preview

### 5) Other Updates
- Improved some labels for clarity (example: `lIALLevel` -> `LIAL Level`).
- Updated footer version in multiple pages to `Version 0.6`.
