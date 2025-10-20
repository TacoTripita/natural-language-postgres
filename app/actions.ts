"use server";

import { Config, configSchema, explanationsSchema, Result } from "@/lib/types";
import { openai } from "@ai-sdk/openai";
import { sql } from "@vercel/postgres";
import { generateObject } from "ai";
import { z } from "zod";

export const generateQuery = async (input: string) => {
  "use server";
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      system: `You are a SQL (postgres) and data visualization expert. Your job is to help the user write a SQL query to retrieve the data they need. Below is the schema with explanations of tables, fields, and relationships. 
      Use this schema knowledge to generate correct queries.

     ### access_package_allotments
Purpose: keep track of the carrier csv exports.
Fields:
id SERIAL PRIMARY KEY: Unique identifier for each export.
access_package_id int8 FOREIGN KEY → access_packages.id: unique identifier for the access_packages.
name VARCHAR: description of the event.
used int4: quantity of profiles exported.
allotment NUMERIC: amount of exports given in the period.
period DATERANGE: range of time for the allotment.
created_at TIMESTAMP: time the record started.
updated_at TIMESTAMP: time the record updated.


### access_packages 
Purpose: keep track of the active features for each customer subscription.
Fields:
id SERIAL PRIMARY KEY: unique identifier for each subscription.
resource_type VARCHAR: type of resource associated with the subscription. 
- 'CarrierProfile' for carriers with premium subscriptions
- 'BrokerageProfile' for brokers with premium subscriptions
- 'User' for prospecting subscriptions
resource_id INT8 FOREIGN KEY →  references the associated resource:
- carrier_profiles.id (for CarrierProfile)
- brokerage_profiles.id (for BrokerageProfile)
- users.id (for User)
active BOOL: shows whether the subscription is active or inactive.
created_at TIMESTAMP: time the subscription started.
updated_at TIMESTAMP: time the subscription updated.
 

### action_text_rich_texts
Purpose: holds the descriptions and general information about Truck Driver Jobs and their sections.  
Fields:  
id SERIAL PRIMARY KEY: unique identifier.  
name VARCHAR: type of description associated.  
- 'benefits': job benefits description (only when record_type = 'DriverJob')  
- 'description': details about the specific position (only when record_type = 'DriverJob')  
- 'driver_jobs_description': general information about the jobs section (only when record_type = 'CarrierProfile')  
- 'requirements': requirements for the specific position (only when record_type = 'DriverJob')  
body TEXT: content in HTML format.  
record_type VARCHAR: type of record associated with the entry.  
record_id INT8 FOREIGN KEY → references the associated resource:  
- carrier_profiles.id (when record_type = 'CarrierProfile')  
- driver_jobs.id (when record_type = 'DriverJob')  
created_at TIMESTAMP: time the record started.
updated_at TIMESTAMP: time the record updated.

### active_admin_comments
Purpose: comments done in admin 
Fields:  
id SERIAL PRIMARY KEY: unique identifier.  
namespace VARCHAR: where the comment was placed.
body TEXT: comment description.
resource_type VARCHAR: type of resource associated.  
- 'Review': for carrier reviews comments
- 'BrokerageReview': for brokerage reviews comments
- 'Company': for companies comments
resource_id INT8 FOREIGN KEY →  references the associated resource:
- reviews.id (when resource_type = 'Reviews')  
- brokerage_reviews.id (when resource_type = 'BrokerageReview')  
- companies.id ( when resource_type = 'Company')  
author_type VARCHAR: type of author 
author_id INT8 FOREIGN KEY →  user.id: unique identifier for the user.



### active_campaign_records
Purpose: 
Fields: 
id SERIAL PRIMARY KEY: unique identifier.  
record_type VARCHAR: type of resource associated.
record_id  INT8 FOREIGN KEY:
external_id INT8
created_at TIMESTAMP: time the record started.
updated_at TIMESTAMP: time the record updated.


### active_storage_attachments
Purpose: keep track of the of media / assets of the companies profiles
Fields: 
id SERIAL PRIMARY KEY: unique identifier.  
name VARCHAR: name of the  media / asset
record_type VARCHAR: type of resource associated.
- 'ActionText::RichText': for action_text_rich_texts
- 'ActiveStorage::Blob': for active_storage_blobs
- 'ActiveStorage::VariantRecord': for active_storage_variant_records
- 'Analytics::CompanyEventFeedExport': for analytics_company_event_feed_exports
- 'Analytics::EventFeed': for analytics_event_feeds
- 'Broker': 
- 'BrokerageProfile': for brokerage_profiles
- 'BrokerageProfileAsset': for brokerage_profile_assets
- 'BrokerageReview': for brokerage_reviews
- 'CarrierCsvExport': for carrier_csv_exports
- 'CarrierNetworkBuilderMessage': for carrier_network_builder_messages
- 'CarrierProfile': for carrier_profiles
- 'CarrierProfileAsset': for carrier_profile_assets
- 'CarrierProfileWebsite': for carrier_profile_websites
- 'CarrierUser': 
- 'ClaimPartner': for claim_partners
- 'DriverCarrierReview': for driver_carrier_reviews
- 'Review': for reviews
- 'User': for users
- 'Widget': for widgets
record_id  INT8 FOREIGN KEY:
- action_text_rich_texts.id (when resource_type = 'ActionText::RichText')  
- active_storage_blobs.id (when resource_type = 'ActiveStorage::Blob') 
- active_storage_variant_records.id (when resource_type = 'ActiveStorage::VariantRecord') 
- analytics_company_event_feed_exports.id (when resource_type = 'Analytics::CompanyEventFeedExport') 
-analytics_event_feeds.id (when resource_type = 'Analytics::EventFeed') 
- brokerage_profiles.id (when resource_type = 'BrokerageProfile') 
- reviews.id (when resource_type = 'BrokerageProfileAsset') 
- brokerage_reviews.id (when resource_type = 'BrokerageReview') 
- carrier_csv_exports.id (when resource_type = 'CarrierCsvExport') 
- carrier_network_builder_messages.id (when resource_type = 'CarrierNetworkBuilderMessage') 
 - carrier_profiles.id (when resource_type = 'CarrierProfile') 
 - carrier_profile_assets.id (when resource_type = 'CarrierProfileAsset') 
 - carrier_profile_websites.id (when resource_type = 'CarrierProfileWebsite') 
 - ?.id (when resource_type = 'CarrierUser') 
 - claim_partners.id (when resource_type = 'ClaimPartner') 
 - driver_carrier_reviews.id (when resource_type = 'DriverCarrierReview') 
 - reviews.id (when resource_type = 'Review') 
 - users.id (when resource_type = 'User') 
 - widgets.id (when resource_type = 'Widget') 
external_id INT8
blob_id INT8 FOREIGN KEY →  active_storage_blobs.id: unique identifier for the blobs.

created_at TIMESTAMP: 

### analytics_events
Purpose: The analytics_events table stores all interactions and event data. For performance and query efficiency, data is also partitioned by month into separate tables following the naming convention analytics_events_YYYY_MM.
Fields:
id SERIAL PRIMARY KEY: unique identifier for each event.
visit_id INT8 FOREIGN KEY → analytics_visits.id: links the event to a specific visit/session.
user_id INT8 FOREIGN KEY → users.id: user who triggered the event (if logged in).
name VARCHAR: event names, including: 
-Asset Viewed.
-Brokerage Contact Viewed.
-Brokerage Listing Viewed.
-Carrier Contact Viewed.
-Carrier Listing Viewed.
-Email Signature Clicked.
-Email Signature Viewed.
-Page Viewed.
-Request for Proposal Alternative Suggested.
-Request for Proposal Submitted.
-Sponsored Content Clicked.
-Sponsored Content Viewed.
-Widget Viewed.
time TIMESTAMP: timestamp of when the event occurred.
properties JSONB: flexible metadata about the event, including:
-id (DECIMAL) FOREIGN KEY →  companies.id 
-entity_type TEXT: type of entity (carrier, broker).
-route TEXT: route of the request.
-url TEXT: full request URL.
-referrer TEXT: referring URL.
-widget_id DECIMAL: widget identifier (if event is widget-related).
-widget_type TEXT: type of widget.
-path_parameters.carrier_id TEXT: carrier referenced in the request.
-path_parameters.state TEXT: state referenced in the request.
-path_parameters.city TEXT: city referenced in the request.
-path_parameters.subdomain TEXT: subdomain referenced in the request.
-path_parameters.country TEXT: country referenced in the request.
-path_parameters.controller TEXT: Rails controller name.
-path_parameters.action TEXT: Rails action name.
-path_parameters.id TEXT: id referenced in the path.
-path_parameters.user_id TEXT: user referenced in the path.
-path_parameters.asset_id TEXT: asset referenced in the path.
-path_parameters.format TEXT: format requested.
-path_parameters.origin TEXT: trip origin (if applicable).
-path_parameters.destination TEXT: trip destination (if applicable).


### analytics_shipper_events
Purpose: stores analytics data about shipper-related events, including searches and interactions tied to companies, visits, and freight parameters. For performance and query efficiency, data is also partitioned by month into separate tables following the naming convention analytics_shipper_events_YYYY_MM.
Fields:
id BIGSERIAL PRIMARY KEY: unique identifier for each shipper event.
event_id INT8 FOREIGN KEY → analytics_events.id: identifier of the related analytics event.
visit_id INT8 FOREIGN KEY → analytics_visits.id: links the shipper event to a specific visit/session.
analytics_company_id INT8 FOREIGN KEY → analytics_companies.id: identifier of the analytics company associated with the event.
type VARCHAR: event type:
-brokerage.listing.viewed
-brokerage.profile.viewed
-brokerage.rfp.submitted
-brokerage.sponsored-content.clicked
-brokerage.sponsored-content.viewed
-brokerage.widget.viewed
-carrier.contact.viewed
-carrier.listing.viewed
-carrier.profile.viewed
-carrier.rfp.submitted
-carrier.search.performed
-carrier.sponsored-content.clicked
-carrier.sponsored-content.viewed
-carrier.widget.viewed
url VARCHAR: URL associated with the event.
company_id INT8 FOREIGN KEY → companies.id: identifier of the related company.
company_entity_type VARCHAR: type of company entity (Carrier, Broker).
search_city_id INT8 FOREIGN KEY → cities.id: identifier of the searched city.
search_state_id VARCHAR: identifier of the searched state.
search_region_id VARCHAR: identifier of the searched region.
search_country_id VARCHAR: identifier of the searched country.
search_freight_ids INT8[] FOREIGN KEY → freights.id: array of freight type IDs searched.
search_truck_type_ids INT8[]: array of truck type IDs searched.
search_shipment_type_ids INT8[]: array of shipment type IDs searched.
search_specialized_service_ids INT8[]: array of specialized service IDs searched.
time TIMESTAMP: timestamp of when the event occurred.
search_destination_city_id INT8 FOREIGN KEY → cities.id: identifier of the searched destination city.
search_destination_state_id VARCHAR: identifier of the searched destination state.
search_destination_region_id VARCHAR: identifier of the searched destination region.
search_destination_country_id VARCHAR: identifier of the searched destination country.

### analytics_visits 
Purpose: Track website/app visits and related metadata for analytics. For performance and query efficiency, data is also partitioned by month into separate tables following the naming convention analytics_visits_YYYY_MM.
Fields:
id int8 PRIMARY KEY: Unique identifier for each visit.
visit_token VARCHAR: Token representing the specific visit.
visitor_token VARCHAR: Token identifying the visitor across sessions.
user_id int8: Reference to the user if logged in.
ip INET: IP address of the visitor.
user_agent TEXT: Browser user agent string.
referrer TEXT: Full referrer URL.
referring_domain VARCHAR: Domain of the referring site.
landing_page TEXT: Landing page URL.
browser VARCHAR: Browser name.
os VARCHAR: Operating system name.
device_type VARCHAR: Device type (desktop, mobile, tablet, etc.).
started_at TIMESTAMP: Timestamp when the visit started.
country VARCHAR: Country of the visitor.
region VARCHAR: Region or state of the visitor.
city VARCHAR: City of the visitor.
latitude FLOAT8: Latitude coordinate.
longitude FLOAT8: Longitude coordinate.
company_id int8: Reference to the associated company.
company_status VARCHAR: Status of the associated company.

### users 
Purpose: Stores information about platform users, their authentication, status, and associated company/analytics company data.
Fields:
id int8 PRIMARY KEY: Unique identifier for each user.
first_name VARCHAR: User’s first name.
last_name VARCHAR: User’s last name.
email CITEXT: User’s email address (case-insensitive).
encrypted_password VARCHAR: Encrypted password for authentication.
confirmation_token VARCHAR: Token used for email confirmation.
remember_token VARCHAR: Token used for “remember me” login functionality.
verified BOOL: Whether the user has verified their email.
verification_token VARCHAR: Token used for verification processes.
created_at TIMESTAMP: Timestamp when the user was created.
updated_at TIMESTAMP: Timestamp when the user was last updated.
admin BOOL: Whether the user has admin privileges.
company VARCHAR: Name or identifier of the user’s associated company.
current_login_ip INET: IP address of the user’s most recent login.
blocked BOOL: Whether the user is blocked from accessing the platform.
stripe_customer_id VARCHAR: Stripe customer identifier for billing purposes.
uuid UUID: Universally unique identifier for the user.
phone VARCHAR: User’s phone number.
analytics_company_id INT8 FOREIGN KEY → analytics_companies.id: Reference to the analytics company associated with the user.




### analytics_companies 
Stores company-level information used for analytics and event tracking, including identification, social links, location, and revenue data.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each analytics company.
name VARCHAR: Company name.
domain VARCHAR: Company’s website domain.
twitter VARCHAR: Company’s Twitter handle or URL.
facebook VARCHAR: Company’s Facebook page URL.
linkedin VARCHAR: Company’s LinkedIn page URL.
industry_id INT8 FOREIGN KEY → analytics_industries.id: Reference to the company’s industry.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.
revenue_year INT4: Year corresponding to the recorded revenue.
revenue_amount NUMERIC: Reported company revenue amount.
city_id INT8 FOREIGN KEY → cities.id: Reference to the company’s city location.
short_name VARCHAR: Abbreviated or alternate name for the company.
uuid UUID: Universally unique identifier for the record.
phone VARCHAR: Company phone number.
employee_range VARCHAR: Category describing the range of company employees.


### analytics_industries 
Purpose: Stores the list of industries used to categorize and group analytics companies.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each industry.
name VARCHAR: Name of the industry.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.


### brokerage_profiles 
Purpose: Stores profile information for brokerage companies, including their specialization, services, and website details.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each brokerage profile.
company_id INT8 FOREIGN KEY → companies.id: References the associated company.
bio TEXT: Description or background information about the brokerage.
specialized_services _INT8: Array of specialized service IDs offered by the brokerage.
no_specialized_services BOOL: Indicates if the brokerage has no specialized services listed.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.
truck_types _INT8: Array of truck type IDs associated with the brokerage.
shipment_types _INT8: Array of shipment type IDs handled by the brokerage.
website_url VARCHAR: URL to the brokerage’s website.
cs_score FLOAT8: Customer satisfaction score for the brokerage.
hide_street BOOL: Indicates whether the street address should be hidden from public view.


### carier_profiles
Purpose: Stores detailed information about carrier companies, including contact details, social links, services, and specialization.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each carrier profile.
email CITEXT: Contact email address for the carrier.
bio TEXT: Description or background information about the carrier.
street VARCHAR: Street address of the carrier’s main terminal.
city VARCHAR: City where the carrier is located.
state VARCHAR: State or province of the carrier’s address.
zip VARCHAR: Postal code for the carrier’s address.
country VARCHAR: Country of the carrier.
phone VARCHAR: Contact phone number for the carrier.
company_rep1 VARCHAR: Primary company representative name.
company_rep2 VARCHAR: Secondary company representative name.
specialized_services _INT8: Array of specialized service IDs offered by the carrier.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.
no_additional_terminals BOOL: Indicates if the carrier operates with no additional terminals.
company_id INT8 FOREIGN KEY → companies.id: References the associated company record.
website_url VARCHAR: URL to the carrier’s official website.
no_specialized_services BOOL: Indicates if the carrier has no specialized services listed.
driver_application_url VARCHAR: URL for driver job applications.
facebook VARCHAR: Link to the carrier’s Facebook page.
twitter VARCHAR: Link to the carrier’s Twitter profile.
linkedin VARCHAR: Link to the carrier’s LinkedIn page.
instagram VARCHAR: Link to the carrier’s Instagram page.
truck_types _INT8: Array of truck type IDs operated by the carrier.
shipment_types _INT8: Array of shipment type IDs handled by the carrier.
cs_score FLOAT8: Customer satisfaction score for the carrier.
hide_street BOOL: Indicates whether the street address should be hidden from public view.


### companies 
Purpose: Stores general company information including identification, contact details, operations, and regulatory data for both carriers and brokers.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each company record.
dot_number INT4: Department of Transportation (DOT) number associated with the company.
slug VARCHAR: URL-friendly unique identifier used for routing or referencing.
email CITEXT: Company’s contact email address.
phone VARCHAR: Primary contact phone number.
street VARCHAR: Street address of the company.
city_name VARCHAR: City name of the company’s address.
state_code VARCHAR: State or province code of the company.
country_code VARCHAR: Country code of the company.
zip VARCHAR: Postal code of the company’s location.
company_rep1 VARCHAR: Primary company representative name.
company_rep2 VARCHAR: Secondary company representative name.
power_units INT4: Number of power units (trucks) operated by the company.
safety_rating VARCHAR: Current safety rating assigned to the company.
safety_rating_date DATE: Date when the safety rating was last updated.
carrier_operation VARCHAR: Type of carrier operation (e.g., interstate, intrastate).
hazmat_indicator BOOL: Indicates whether the company is authorized for hazardous material transport.
mcs_150_mileage NUMERIC: Reported total vehicle mileage according to the MCS-150 form.
mcs_150_mileage_year INT4: Year associated with the reported mileage.
claim_token UUID: Unique token used to claim company ownership or verification.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.
legal_name VARCHAR: Official legal name of the company.
dba_name VARCHAR: “Doing Business As” (DBA) name, if applicable.
hidden BOOL: Indicates whether the company should be hidden from public listings.
name_field VARCHAR: Internal field used for name processing or standardization.
requested_name VARCHAR: Name requested by the company during registration or verification.
name VARCHAR: Public-facing company name.
passengers_only BOOL: Indicates whether the company operates only passenger vehicles.
uuid UUID: Universally unique identifier for cross-system reference.
census_change_date TIMESTAMP: Date when census or company registration data last changed.
city_id INT8 FOREIGN KEY → cities.id: References the associated city record.
active_in_census BOOL: Indicates whether the company is currently active in census data.

### personas 
Purpose: Stores information about user personas within companies, including their type, status, and verification details.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each persona.
user_id INT8 FOREIGN KEY → users.id: References the associated user.
company_id INT8 FOREIGN KEY → companies.id: References the associated company.
type VARCHAR: Type or role of the persona (e.g., admin, manager, staff).
city_id INT8 FOREIGN KEY → cities.id: References the city associated with the persona.
status VARCHAR: Current status of the persona
created_at TIMESTAMP: Timestamp when the persona record was created.
updated_at TIMESTAMP: Timestamp when the persona record was last updated.
verification_token VARCHAR: Token used for verifying the persona.
verified_at TIMESTAMP: Timestamp when the persona was verified.


### operating_authorites 
Purpose: Stores regulatory and authority information for companies, including common, contract, and broker authorities, as well as required filings and flags.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each record.
dot_number INT4: DOT number associated with the company.
docket_number VARCHAR: Official docket number for the operating authority.
pending_common_authority BOOL: Indicates if a common authority is pending.
pending_contract_authority BOOL: Indicates if a contract authority is pending.
pending_broker_authority BOOL: Indicates if a broker authority is pending.
common_authority_revocation BOOL: Indicates if the common authority has been revoked.
contract_authority_revocation BOOL: Indicates if the contract authority has been revoked.
broker_authority_revocation BOOL: Indicates if the broker authority has been revoked.
freight_flag BOOL: Indicates if the company is authorized for freight operations.
household_goods BOOL: Indicates if the company is authorized for household goods transport.
bipd_required INT4: Number of BIPD filings required.
cargo_required BOOL: Indicates if cargo insurance is required.
bond_required BOOL: Indicates if a bond is required.
bipd_on_file INT4: Number of BIPD filings currently on file.
cargo_on_file BOOL: Indicates if cargo insurance is on file.
bond_on_file BOOL: Indicates if a bond is on file.
dba_name VARCHAR: “Doing Business As” name of the company.
legal_name VARCHAR: Official legal name of the company.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.
uuid UUID: Universally unique identifier for the record.
common_authority CITEXT: Common authority identifier.
contract_authority CITEXT: Contract authority identifier.
broker_authority CITEXT: Broker authority identifier.

### reviews
Purpose: Stores reviews submitted by users about carriers, including ratings, feedback, and associated data.
Fields:
id INT4 PRIMARY KEY: Unique identifier for each review.
likes TEXT: Positive aspects mentioned in the review.
dislikes TEXT: Negative aspects mentioned in the review.
timeliness INT4: Rating for timeliness of service.
cleanliness INT4: Rating for cleanliness.
communication INT4: Rating for communication.
consider_expensive INT4: Rating or indication if the service was considered expensive.
is_consider_next_time BOOL: Indicates if the reviewer would consider using the service again.
status CITEXT: Current status of the review (e.g., approved, pending).
created_at TIMESTAMP: Timestamp when the review was created.
updated_at TIMESTAMP: Timestamp when the review was last updated.
review_notes TEXT: Additional notes or comments about the review.
anonymous BOOL: Indicates if the review was submitted anonymously.
pickup_state VARCHAR: State from which the shipment was picked up.
pickup_city VARCHAR: City from which the shipment was picked up.
dropoff_state VARCHAR: State where the shipment was delivered.
dropoff_city VARCHAR: City where the shipment was delivered.
how_often INT4: Frequency of using the carrier
rejection_reason VARCHAR: Reason for rejection if the review was rejected.
offer_electronic_tracking BOOL: Indicates if electronic tracking was offered.
electronic_tracking_worked BOOL: Indicates if the offered electronic tracking worked.
related_to_carrier BOOL: Indicates if the review is directly related to a carrier.
offer_reference BOOL: Indicates if a reference was offered.
is_reference BOOL: Indicates if the review is considered a reference.
featured BOOL: Indicates if the review is featured.
specialized_services _INT8: Array of specialized service IDs associated with the review.
user_id INT8 FOREIGN KEY → users.id: References the user who submitted the review.
utm_param_id INT8 FOREIGN KEY → utm_params.id: References the UTM tracking parameters associated with the review.
freights _INT4: Array of freight IDs related to the review.
title VARCHAR: Title of the review.
body TEXT: Full textual content of the review.
last_worked_with DATE: Date when the reviewer last worked with the carrier.
carrier_discovery VARCHAR: Method by which the reviewer discovered the carrier.
form_version INT4: Version of the review form used.
receive_availability_updates BOOL: Indicates if the reviewer opted to receive availability updates.
company_id INT8 FOREIGN KEY → companies.id: References the associated company.
star_rating NUMERIC: Overall star rating given in the review.
submitted_at TIMESTAMP: Timestamp when the review was submitted.
uuid UUID: Universally unique identifier for the review.
persona_id INT8 FOREIGN KEY → personas.id: References the associated persona.
truck_types _INT8: Array of truck type IDs relevant to the review.
shipment_types _INT8: Array of shipment type IDs relevant to the review.


### brokerage_profile_users
Purpose: Tracks users who have attempted to claim brokerage profiles and their claim status 
Fields: 
id INT8 PRIMARY KEY: Unique identifier for each record.
brokerage_profile_id INT8 FOREIGN KEY → brokerage_profiles.id: References the brokerage profile being claimed.
user_id INT8 FOREIGN KEY → users.id: References the user attempting to claim the brokerage profile.
status VARCHAR: Current status of the claim (e.g., pending, approved, rejected).
verification_token VARCHAR: Token used to verify the claim attempt.
verified_at TIMESTAMP: Timestamp indicating when the claim was verified.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.


### carrier_profile_users
Purpose: Tracks users who have attempted to claim carrier profiles and their claim status.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each record.
carrier_profile_id INT8 FOREIGN KEY → carrier_profiles.id: References the carrier profile being claimed.
user_id INT8 FOREIGN KEY → users.id: References the user attempting to claim the carrier profile.
status VARCHAR: Current status of the claim (e.g., pending, approved, rejected).
verification_token VARCHAR: Token used to verify the claim attempt.
verified_at TIMESTAMP: Timestamp indicating when the claim was verified.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.


### brokerage_reviews
Purpose: Stores reviews submitted by users about brokerages, including ratings, comments, and related data.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each review.
company_id INT8 FOREIGN KEY → companies.id: References the brokerage company being reviewed.
user_id INT8 FOREIGN KEY → users.id: References the user who submitted the review.
status VARCHAR: Review status (e.g., pending, approved, rejected).
rejection_reason VARCHAR: Reason provided if the review was rejected.
title VARCHAR: Title of the review.
nps INT4: Net Promoter Score value.
star_rating NUMERIC: Star rating given by the user.
persona_id INT8 FOREIGN KEY → personas.id: References the reviewer’s persona.
industry_id INT8 FOREIGN KEY → analytics_industries.id: References the industry related to the review.
utm_param_id INT8 FOREIGN KEY → utm_params.id: References UTM parameters for tracking review origins.
is_consider_next_time BOOL: Indicates if the reviewer would consider working with the brokerage again.
body TEXT: Main text content of the review.
last_worked_with DATE: Date of last collaboration with the brokerage.
discovery VARCHAR: How the reviewer discovered the brokerage.
consider_expensive INT4: Indicates whether the brokerage was considered expensive.
how_often INT4: Frequency of interactions with the brokerage.
communication INT4: Rating of communication quality.
freights INT4: Array of freight types related to the review.
specialized_services INT8: Array of specialized services mentioned in the review.
electronic_tracking BOOL: Indicates if electronic tracking was offered.
offer_reference BOOL: Indicates if a reference was offered.
related BOOL: Indicates if the review is related to the company’s services.
anonymous BOOL: Marks whether the review was submitted anonymously.
submitted_at TIMESTAMP: Timestamp when the review was submitted.
created_at TIMESTAMP: Timestamp when the review record was created.
updated_at TIMESTAMP: Timestamp when the review record was last updated.
truck_types INT8: Array of  truck types mentioned in the review.
shipment_types INT8: Array of shipment types mentioned in the review.
featured BOOL: Marks if the review is featured or highlighted.

### reviews_aggregates 
Purpose: Stores aggregated review metrics and sentiment analysis data for companies, combining ratings, scores, and review statistics.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each aggregate record.
sentiments JSONB: JSON field containing detailed sentiment data across multiple categories.
sentiments → 1 DECIMAL: Amount of reviews with sentiments.id = 1.
sentiments → 2 DECIMAL: Amount of reviews with sentiments.id = 2.
sentiments → 3 DECIMAL: Amount of reviews with sentiments.id = 3.
sentiments → 4 DECIMAL: Amount of reviews with sentiments.id = 4.
sentiments → 5 DECIMAL: Amount of reviews with sentiments.id = 5.
sentiments → 6 DECIMAL: Amount of reviews with sentiments.id = 6.
sentiments → 7 DECIMAL: Amount of reviews with sentiments.id = 7.
sentiments → 8 DECIMAL: Amount of reviews with sentiments.id = 8.
sentiments → 9 DECIMAL: Amount of reviews with sentiments.id = 9.
sentiments → 10 DECIMAL: Amount of reviews with sentiments.id = 10.
sentiments → 11 DECIMAL: Amount of reviews with sentiments.id = 11.
sentiments → 12 DECIMAL: Amount of reviews with sentiments.id = 12.
sentiments → 13 DECIMAL: Amount of reviews with sentiments.id = 13.
sentiments → 14 DECIMAL: Amount of reviews with sentiments.id = 14.
sentiments → 15 DECIMAL: Amount of reviews with sentiments.id = 15.
sentiments → 16 DECIMAL: Amount of reviews with sentiments.id = 16.
sentiments → 17 DECIMAL: Amount of reviews with sentiments.id = 17.
sentiments → 18 DECIMAL: Amount of reviews with sentiments.id = 18.
sentiments → 20 DECIMAL: Amount of reviews with sentiments.id = 20.
sentiments → 21 DECIMAL: Amount of reviews with sentiments.id = 21.
sentiments → 23 DECIMAL: Amount of reviews with sentiments.id = 23
company_id INT8 FOREIGN KEY → companies.id: References the company the aggregate belongs to.
star_rating NUMERIC: Average star rating calculated from all reviews.
review_count INT4: Total number of approved reviews.
offer_electronic_tracking NUMERIC: Average value indicating how often electronic tracking was offered.
electronic_tracking_worked NUMERIC: Average value indicating how often electronic tracking worked properly.
created_at TIMESTAMP: Timestamp when the aggregate record was created.
updated_at TIMESTAMP: Timestamp when the aggregate record was last updated.
timeliness NUMERIC: Average timeliness rating.
cleanliness NUMERIC: Average cleanliness rating.
communication NUMERIC: Average communication rating.


### brokerage_review_aggregates 
Purpose: Stores aggregated brokerage review metrics and sentiment data, including star ratings,communication scores, and detailed sentiment counts.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each aggregate record.
sentiments JSONB: JSON field containing detailed sentiment data across multiple categories.
sentiments → 6 DECIMAL: Amount of reviews with sentiments.id = 6.
sentiments → 7 DECIMAL: Amount of reviews with sentiments.id = 7.
sentiments → 8 DECIMAL: Amount of reviews with sentiments.id = 8.
sentiments → 24 DECIMAL: Amount of reviews with sentiments.id = 24.
sentiments → 25 DECIMAL: Amount of reviews with sentiments.id = 25.
sentiments → 26 DECIMAL: Amount of reviews with sentiments.id = 26.
sentiments → 27 DECIMAL: Amount of reviews with sentiments.id = 27.
sentiments → 28 DECIMAL: Amount of reviews with sentiments.id = 28.
sentiments → 29 DECIMAL: Amount of reviews with sentiments.id = 29.
sentiments → 30 DECIMAL: Amount of reviews with sentiments.id = 30.
sentiments → 31 DECIMAL: Amount of reviews with sentiments.id = 31.
sentiments → 32 DECIMAL: Amount of reviews with sentiments.id = 32.
sentiments → 33 DECIMAL: Amount of reviews with sentiments.id = 33.
sentiments → 34 DECIMAL: Amount of reviews with sentiments.id = 34.
sentiments → 35 DECIMAL: Amount of reviews with sentiments.id = 35.
sentiments → 36 DECIMAL: Amount of reviews with sentiments.id = 36.
sentiments → 37 DECIMAL: Amount of reviews with sentiments.id = 37.
sentiments → 38 DECIMAL: Amount of reviews with sentiments.id = 38.
sentiments → 39 DECIMAL: Amount of reviews with sentiments.id = 39.
sentiments → 40 DECIMAL: Amount of reviews with sentiments.id = 40.
sentiments → 41 DECIMAL: Amount of reviews with sentiments.id = 41.
sentiments → 42 DECIMAL: Amount of reviews with sentiments.id = 42.
sentiments → 43 DECIMAL: Amount of reviews with sentiments.id = 43.
company_id INT8 FOREIGN KEY → companies.id: References the brokerage company the aggregate belongs to.
review_count INT4: Total number of approved reviews.
star_rating NUMERIC: Average star rating from approved reviews.
communication NUMERIC: Average communication score across all reviews.
created_at TIMESTAMP: Timestamp when the aggregate record was created.
updated_at TIMESTAMP: Timestamp when the aggregate record was last updated.


### carrier_operation_states 
Purpose: Creates a record for each state that a carrier has reported operating in.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each carrier-state record.
carrier_profile_id INT8 FOREIGN KEY → carrier_profiles.id: References the carrier profile associated with the state.
state_id VARCHAR: Identifier of the state the carrier operates in.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.

### carrier_profile_terminals
Purpose:  Creates a record for each terminal location for each carrier profile.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each terminal record.
carrier_profile_id INT8 FOREIGN KEY → carrier_profiles.id: References the carrier profile associated with the terminal.
city_id INT8 FOREIGN KEY → cities.id: References the city where the terminal is located.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.


### companies_freights 
Purpose: Associates companies with the freights they handle.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each company-freight record.
company_id INT8 FOREIGN KEY → companies.id: References the company handling the freight.
freight_id INT8 FOREIGN KEY → freights.id: References the freight associated with the company.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.


### cities 
Purpose: Stores information about cities, including location and population.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each city.
latitude FLOAT8: Latitude coordinate of the city.
longitude FLOAT8: Longitude coordinate of the city.
slug VARCHAR: URL-friendly version of the city name.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.
population INT4: Population of the city.
name VARCHAR: Name of the city.
ascii_name VARCHAR: ASCII-compatible version of the city name.
state_code VARCHAR: Code of the state the city belongs to.
country_code VARCHAR: Code of the country the city belongs to.


### specialized_services
Purpose: Stores the list of specialized services available.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each specialized service.
name VARCHAR: Name of the specialized service.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.
slug VARCHAR: URL-friendly version of the service name.
row_order INT4: Ordering index for displaying services.
modifiable BOOL: Indicates whether the service can be modified.


### shipment_types 
Purpose: Stores the different types of shipments that companies can handle.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each shipment type.
key VARCHAR: Unique key for the shipment type.
name VARCHAR: Name of the shipment type.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.
uuid UUID: Unique universal identifier for the shipment type.
slug VARCHAR: URL-friendly version of the shipment type name.
row_order INT4: Ordering index for displaying shipment types.
modifiable BOOL: Indicates whether the shipment type can be modified.

### carriers_truck_types
Purpose: Links carriers to the truck types they operate.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each record.
company_id INT8 FOREIGN KEY → companies.id: References the carrier company.
truck_type_id INT8 FOREIGN KEY → truck_types.id: References the truck type the carrier operates.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.

### preferred_lanes
Purpose: Stores the preferred shipping lanes for each carrier.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each record.
carrier_profile_id INT8 FOREIGN KEY → carrier_profiles.id: References the carrier profile.
pickup_city_id INT8 FOREIGN KEY → cities.id: References the pickup city for the lane.
dropoff_city_id INT8 FOREIGN KEY → cities.id: References the dropoff city for the lane.
created_at TIMESTAMP: Timestamp when the record was created.
updated_at TIMESTAMP: Timestamp when the record was last updated.

### freights
Purpose: Stores information about different freight types.
Fields:
id INT4 PRIMARY KEY: Unique identifier for each freight.
name VARCHAR: Name of the freight type.
header VARCHAR: Header or category for the freight type.
uuid UUID: Unique universal identifier for the freight.
slug VARCHAR: URL-friendly version of the name.
modifiable BOOL: Indicates if the freight type can be modified.

### sentiments
Purpose: Stores sentiment categories used to classify review tones or feedback.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each sentiment.
label VARCHAR: Descriptive name of the sentiment (e.g., “Communication”, “Timeliness”).
positive BOOL: Indicates whether the sentiment represents a positive or negative attribute.
created_at TIMESTAMP: Timestamp of when the record was created.
updated_at TIMESTAMP: Timestamp of the most recent update to the record.
slug VARCHAR: URL-friendly version of the sentiment label.

### company_entity_types
Purpose: Defines the type of business entity associated with each company (e.g., carrier, broker, shipper).
Fields:
id INT8 PRIMARY KEY: Unique identifier for each company-entity type record.
company_id INT8 FOREIGN KEY → companies.id: References the associated company in the companies table.
entity_type ENTITY_TYPE: Specifies the type of entity the company represents (carrier, shipper, broker, registrant, freight_forwarder, cargo_tank, iep).
created_at TIMESTAMP: Timestamp of when the record was created.
updated_at TIMESTAMP: Timestamp of the most recent update to the record.

### census 
Purpose: this table holds current companies in the FMCSA, and their data, including contact details, operational classifications, fleet composition, and business types.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each census record.
act_stat VARCHAR: Operational activity status of the company.
carship VARCHAR: Indicates carrier or shipper classification.
dot_number INT4: Unique DOT number assigned to the company.
name VARCHAR: Legal name of the company.
name_dba VARCHAR: “Doing business as” name, if applicable.
dbnum VARCHAR: Database number used internally by FMCSA.
phy_natn VARCHAR: Nature of physical address.
reg VARCHAR: Regional classification or registration code.
phy_str VARCHAR: Physical street address.
phy_city VARCHAR: City for the company’s physical address.
phy_cnty VARCHAR: County for the company’s physical address.
phy_st VARCHAR: State for the company’s physical address.
phy_zip VARCHAR: ZIP code for the physical address.
undeliv_phy VARCHAR: Indicates if the physical address is undeliverable.
tel_num VARCHAR: Telephone number.
cell_num VARCHAR: Mobile number.
fax_num VARCHAR: Fax number.
mai_natn VARCHAR: Nature of mailing address.
mai_str VARCHAR: Mailing street address.
mai_city VARCHAR: Mailing city.
mai_cnty VARCHAR: Mailing county.
mai_st VARCHAR: Mailing state.
mai_zip VARCHAR: Mailing ZIP code.
undeliv_mai VARCHAR: Indicates if the mailing address is undeliverable.
oic VARCHAR: Office or organization code.
terr VARCHAR: Territory or jurisdiction classification.
icc_docket_1_prefix VARCHAR: ICC docket number prefix (1).
icc1 VARCHAR: ICC docket number (1).
icc_docket_2_prefix VARCHAR: ICC docket number prefix (2).
icc2 VARCHAR: ICC docket number (2).
icc_docket_3_prefix VARCHAR: ICC docket number prefix (3).
icc3 VARCHAR: ICC docket number (3).
class VARCHAR: FMCSA classification code.
classdef VARCHAR: Text description of the classification.
crrinter VARCHAR: Interstate carrier flag.
crrhmintra VARCHAR: Intrastate hazardous materials flag.
crrintra VARCHAR: Intrastate carrier flag.
shpinter VARCHAR: Interstate shipper flag.
shpintra VARCHAR: Intrastate shipper flag.
vehicle_registrant VARCHAR: Vehicle registration status.
org VARCHAR: Organizational type.
genfreight VARCHAR: General freight classification.
household VARCHAR: Household goods classification.
metalsheet VARCHAR: Metal sheet transport indicator.
motorveh VARCHAR: Motor vehicle transport indicator.
drivetow VARCHAR: Driveaway/towaway operation flag.
logpole VARCHAR: Log/pole carrier indicator.
bldgmat VARCHAR: Building materials transport indicator.
mobilehome VARCHAR: Mobile home transport indicator.
machlrg VARCHAR: Machinery/large equipment transport indicator.
produce VARCHAR: Produce transport indicator.
liqgas VARCHAR: Liquid gas transport indicator.
intermodal VARCHAR: Intermodal transport indicator.
passengers VARCHAR: Passenger transport indicator.
oilfield VARCHAR: Oil field equipment transport indicator.
livestock VARCHAR: Livestock transport indicator.
grainfeed VARCHAR: Grain/feed transport indicator.
coalcoke VARCHAR: Coal/coke transport indicator.
meat VARCHAR: Meat transport indicator.
garbage VARCHAR: Garbage/refuse transport indicator.
usmail VARCHAR: U.S. mail carrier indicator.
chem VARCHAR: Chemicals transport indicator.
drybulk VARCHAR: Dry bulk transport indicator.
coldfood VARCHAR: Refrigerated goods transport indicator.
beverages VARCHAR: Beverage transport indicator.
paperprod VARCHAR: Paper products transport indicator.
utility VARCHAR: Utility materials transport indicator.
farmsupp VARCHAR: Farm supplies transport indicator.
construct VARCHAR: Construction materials transport indicator.
waterwell VARCHAR: Water well equipment transport indicator.
cargoothr VARCHAR: Other cargo transport indicator.
othercargo VARCHAR: Text description of other cargo type.
hm_ind VARCHAR: Hazardous materials indicator.
owntruck VARCHAR: Owned trucks count or flag.
owntract VARCHAR: Owned tractors count or flag.
owntrail VARCHAR: Owned trailers count or flag.
owncoach VARCHAR: Owned coaches count or flag.
ownschool_1_8 VARCHAR: Owned school buses.
ownschool_9_15 VARCHAR: Owned school buses.
ownschool_16 VARCHAR: Owned school buses.
ownbus_16 VARCHAR: Owned buses.
ownvan_1_8 VARCHAR: Owned vans.
ownvan_9_15 VARCHAR: Owned vans.
ownlimo_1_8 VARCHAR: Owned limousines.
ownlimo_9_15 VARCHAR: Owned limousines.
ownlimo_16 VARCHAR: Owned limousines.
trmtruck VARCHAR: Term Lease trucks count or flag.
trmtract VARCHAR: Term Lease tractors count or flag.
trmtrail VARCHAR: Term Lease trailers count or flag.
trmcoach VARCHAR: Term Lease coaches count or flag.
trmschool_1_8 VARCHAR: Term Lease school buses.
trmschool_9_15 VARCHAR: Term Lease school buses.
trmschool_16 VARCHAR: Term Lease school buses.
trmbus_16 VARCHAR: Term Lease buses.
trmvan_1_8 VARCHAR: Term Lease vans.
trmvan_9_15 VARCHAR: Term Lease vans.
trmlimo_1_8 VARCHAR: Term Lease limousines.
trmlimo_9_15 VARCHAR: Term Lease limousines .
trmlimo_16 VARCHAR: Term Lease  limousines.
trptruck VARCHAR: Trip lease trucks count or flag.
trptract VARCHAR: Trip lease tractors count or flag.
trptrail VARCHAR: Trip lease trailers count or flag.
trpcoach VARCHAR: Trip lease coaches count or flag.
trpschool_1_8 VARCHAR: Trip lease school buses.
trpschool_9_15 VARCHAR: Trip lease school buses.
trpschool_16 VARCHAR: Trip lease school buses.
trpbus_16 VARCHAR: Trip lease buses.
trpvan_1_8 VARCHAR: Trip lease vans.
trpvan_9_15 VARCHAR: Trip lease vans.
trplimo_1_8 VARCHAR: Trip lease limousines.
trplimo_9_15 VARCHAR: Trip lease limousines.
trplimo_16 VARCHAR: Trip lease limousines.
tot_trucks VARCHAR: Total number of trucks.
tot_buses VARCHAR: Total number of buses.
tot_pwr INT4: Total power units.
fleetsize VARCHAR: Fleet size description.
interlt100 VARCHAR: Interstate trucks <100 miles indicator.
intergt100 VARCHAR: Interstate trucks >100 miles indicator.
inter_drs VARCHAR: Interstate drivers indicator.
intralt100 VARCHAR: Intrastate trucks <100 miles indicator.
intragt100 VARCHAR: Intrastate trucks >100 miles indicator.
intra_drs VARCHAR: Intrastate drivers indicator.
avg_tld VARCHAR: Average TLD (total loaded distance).
tot_drs VARCHAR: Total drivers.
cdl_drs VARCHAR: CDL licensed drivers.
revtype VARCHAR: Revenue type classification.
revdocnum VARCHAR: Revenue document number.
revdate VARCHAR: Revenue date.
acc_rate VARCHAR: Accident rate.
repprevrat VARCHAR: Previous FMCSA rating.
mlg150 VARCHAR: Mileage <150 miles.
mlg151 VARCHAR: Mileage ≥150 miles.
rating VARCHAR: FMCSA safety rating.
ratedate VARCHAR: Safety rating date.
phy_barrio VARCHAR: Physical neighborhood.
mai_barrio VARCHAR: Mailing neighborhood.
mcsipstep VARCHAR: MCSP step indicator.
mcsipdate VARCHAR: MCSP date.
userid VARCHAR: User ID for record entry.
addcode VARCHAR: Added code.
upd_reas VARCHAR: Reason for last update.
delcode VARCHAR: Deletion code.
mcs150mileageyear VARCHAR: Mileage year for 150-mile reporting.
adddate VARCHAR: Record creation date.
chgndate VARCHAR: Last change date.
deldate VARCHAR: Record deletion date.
tot_cars VARCHAR: Total cars.
version VARCHAR: Record version.
createdate VARCHAR: Date record was created.
adduserid VARCHAR: User who added the record.
deluserid VARCHAR: User who deleted the record.
mcs_150_date VARCHAR: Date for 150-mile reporting.
rec_update_flag VARCHAR: Record update flag.
emailaddress VARCHAR: Company email address.
usdot_revoked_flag VARCHAR: USDOT revoked indicator.
usdot_revoked_number VARCHAR: USDOT revoked number.
company_rep1 VARCHAR: Primary company representative.
company_rep2 VARCHAR: Secondary company representative.

### persona_verifications
Purpose: Stores a record for each user who has a persona and performed an action requiring persona verification, including the verification status and contact details.
Fields:
id INT8 PRIMARY KEY: Unique identifier for each persona verification record.
persona_id INT8 FOREIGN KEY → personas.id: References the associated persona.
status VARCHAR: Current status of the verification (e.g., pending, verified, rejected).
company VARCHAR: Name of the company associated with the persona.
title VARCHAR: Job title of the persona.
phone VARCHAR: Phone number of the persona.
email VARCHAR: Email address of the persona.
linkedin VARCHAR: LinkedIn profile URL of the persona.
created_at TIMESTAMP: Timestamp when the verification record was created.
updated_at TIMESTAMP: Timestamp when the verification record was last updated.
   

    Only retrieval queries are allowed.

    When relevant, use joins to connect related tables
    
    For string fields, use the ILIKE operator and convert both the search term and the field to lowercase using LOWER() for case-insensitive matching. For example: LOWER(city) ILIKE LOWER('%search_term%').
    
    EVERY QUERY SHOULD RETURN QUANTITATIVE DATA THAT CAN BE PLOTTED ON A CHART! There should always be at least two columns. If the user asks for a single column, return the column and the count of the column. If the user asks for a rate, return the rate as a decimal. For example, 0.1 would be 10%.

    Avoid NULL values in output. Use COUNT, GROUP BY, and JOINs as needed to generate meaningful insights from the schema above.

    `,
      prompt: `Generate the query necessary to retrieve the data the user wants: ${input}`,
      schema: z.object({
        query: z.string(),
      }),
    });
    return result.object.query;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to generate query");
  }
};

export const runGenerateSQLQuery = async (query: string) => {
  "use server";
  // Check if the query is a SELECT statement
  if (
    !query.trim().toLowerCase().startsWith("select") ||
    query.trim().toLowerCase().includes("drop") ||
    query.trim().toLowerCase().includes("delete") ||
    query.trim().toLowerCase().includes("insert") ||
    query.trim().toLowerCase().includes("update") ||
    query.trim().toLowerCase().includes("alter") ||
    query.trim().toLowerCase().includes("truncate") ||
    query.trim().toLowerCase().includes("create") ||
    query.trim().toLowerCase().includes("grant") ||
    query.trim().toLowerCase().includes("revoke")
  ) {
    throw new Error("Only SELECT queries are allowed");
  }

  let data: any;
  try {
    data = await sql.query(query);
  } catch (e: any) {
    if (e.message.includes('relation "companies" does not exist')) {
      console.log(
        "Table does not exist, creating and seeding it with dummy data now...",
      );
      // throw error
      throw Error("Table does not exist");
    } else {
      throw e;
    }
  }

  return data.rows as Result[];
};

export const explainQuery = async (input: string, sqlQuery: string) => {
  "use server";
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        explanations: explanationsSchema,
      }),
      system: `You are a SQL (postgres) expert. Your job is to explain to the user write a SQL query you wrote to retrieve the data they asked for. The table schema is as follows:
      
     ### companies 
     Purpose: Stores basic information about carrier or broker companies.
     Fields:
    id SERIAL PRIMARY KEY: Unique identifier for each company.
    name TEXT NOT NULL: Company name.
    dot_number int4: US Department of Transportation number.
    email TEXT: Contact email.
    power_units int4: Number of power units (fleet size).
    city varchar: City location of headquarters.
    state varchar: State location of headquarters.
    

    ### analytics_shipper_events 
    Purpose: Tracks shipper activity on the platform. Each row = 1 event.
    Fields:
   id SERIAL PRIMARY KEY: Event ID.
   analytics_company_id int8 FOREIGN KEY → analytics_companies.id: Shipper who generated the event.
   type varchar: Event type
   company_id int8 FOREIGN KEY → companies.id: Carrier/Broker who received the event.
   search_city_id int8 FOREIGN KEY → cities.id: City involved in a search.
   search_freight_ids int8 FOREIGN KEY → freights.id: Freight types requested.
   search_truck_type_ids int8 FOREIGN KEY → truck_types.id: Truck types requested.
   search_shipment_type_ids int8 FOREIGN KEY → shipment_types.id: Shipment types requested.
   search_specialized_service_ids int8 FOREIGN KEY → specialized_services.id: Specialized service requested. 
   time timestamp: Event timestamp.
   

    ### analytics_companies 
    Purpose: Metadata for shipper companies tracked in analytics.
    Fields: 
   id SERIAL PRIMARY KEY: Unique identifier for each shipper.  
   name varchar: Company name. 
   industry_id int8 FOREIGN KEY → analytics_industries.id: Industry classification.
   

    ### analytics_industries 
    Purpose: Lookup table of industries.
    Fields:
   id SERIAL PRIMARY KEY: Unique identifier.
   name varchar: Industry name.
   

    ### cities 
    Purpose: Lookup for cities.
    Fields:
   id SERIAL PRIMARY KEY: Unique identifier.
   name varchar: City name. 
   state_code varchar: State abbreviation.
   

    ### freights 
    Purpose: Lookup for freight types.
    Fields:
   id SERIAL PRIMARY KEY: Unique identifier.
   name varchar: Freight type name.  
   

    ### truck_types 
    Purpose: Lookup for truck types.
    Fields:
   id SERIAL PRIMARY KEY: Unique identifier.
   name varchar: Truck type name.   
  

    ### shipment_types 
    Purpose: Lookup for shipment types.
    Fields:
   id SERIAL PRIMARY KEY: Unique identifier.
   name varchar: Shipment type name.  
   
 
    ### specialized_services
    Purpose: Lookup for specialized services.
    Fields:
   id SERIAL PRIMARY KEY: Unique identifier.
   name varchar: Specialized service name.

    When you explain, break the query into unique sections (for example: "SELECT *", "FROM companies", "WHERE city = 'Chicago'") and explain each part concisely, especially JOINs, filters, and GROUP BY logic. If a section doesn't need an explanation, include it with an empty explanation.

    `,
      prompt: `Explain the SQL query you generated to retrieve the data the user wanted. Assume the user is not an expert in SQL. Break down the query into steps. Be concise.

      User Query:
      ${input}

      Generated SQL Query:
      ${sqlQuery}`,
    });
    return result.object;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to generate query");
  }
};

export const generateChartConfig = async (
  results: Result[],
  userQuery: string,
) => {
  "use server";
  const system = `You are a data visualization expert. `;

  try {
    const { object: config } = await generateObject({
      model: openai("gpt-4o"),
      system,
      prompt: `Given the following data from a SQL query result, generate the chart config that best visualises the data and answers the users query.
      For multiple groups use multi-lines.

      Here is an example complete config:
      export const chartConfig = {
        type: "pie",
        xKey: "month",
        yKeys: ["sales", "profit", "expenses"],
        colors: {
          sales: "#4CAF50",    // Green for sales
          profit: "#2196F3",   // Blue for profit
          expenses: "#F44336"  // Red for expenses
        },
        legend: true
      }

      User Query:
      ${userQuery}

      Data:
      ${JSON.stringify(results, null, 2)}`,
      schema: configSchema,
    });

    const colors: Record<string, string> = {};
    config.yKeys.forEach((key, index) => {
      colors[key] = `hsl(var(--chart-${index + 1}))`;
    });

    const updatedConfig: Config = { ...config, colors };
    return { config: updatedConfig };
  } catch (e) {
    // @ts-expect-errore
    console.error(e.message);
    throw new Error("Failed to generate chart suggestion");
  }
};
