# omni-salesforce-apis

Documentation : https://drive.google.com/file/d/1ZehmZ8jjmtNjZ6uhVeVseBk2TqdMq3tC/view?usp=sharing

BaseUrl/token
Salesforce API password is the combination of salesforce site login password + security token

password is the combination of salesforce site login password + security token
For security token - It will be given by Troy/KiranV 

### Install dependencies and packages

    npm i
    cd lambdaLayer/lib/nodejs
    npm i

### Serverless deployent instructions

    npm i serverless
    npm i
    cd lambdaLayer/lib/nodejs
    npm i
    cd ../../..
    serverless --version
    sls deploy -s ${env.ENVIRONMENT}


### Steps
1. First get Access token from the below request, based on 
https://login.salesforce.com/services/oauth2/token?grant_type=password&client_id={value}&client_secret={value}&username={value}&password={mcleod API PAssword}

2. Use the access token from the above request for all API calls used after this step   

3. PATCH PARENT ACCOUNT

Use method PATCH : https://omnilogistics.my.salesforce.com/services/data/v53.0/sobjects/Account/Unique_Id__c/{parent name}
example parent name : AG CUSTOMS BROKERAGE INC.(ATL)
Response :
{
    "id": "0015f00001Z8xlIAAR", // store this ID - (parent_Id)
    "success": true,
    "errors": [],
    "created": true
}

4. GET OWNER ID 

use Method GET : https://omnilogistics.my.salesforce.com/services/data/v53.0/sobjects/User/Unique_Name__c/{owner id}
example ownerId : CRM Admin
Response :
{
    "attributes": {
        "type": "User",
        "url": "/services/data/v53.0/sobjects/User/0055f000008IQ4bAAG"
    },
    "Id": "0055f000008IQ4bAAG", // store this ID - (owner_Id)
    .
    .
    .
}

5. PATCH CHILD ACCOUNT

Use Method PATCH : https://omnilogistics.my.salesforce.com/services/data/v53.0/sobjects/Account/Unique_Id__c/{child_name or child_id}
example child name : AGAGCAGCUSTATLAGCUSTATL - This is a combination of SourceSystem+Division+BillToNum+ContrlNum

{
    "Name": "AG CUSTOMS BROKERAGE INC.(ATL)",
    "Source_System__c": "AG",
    "Division__c": "AGC",
    "OwnerId": "0055f000008IQ4bAAG", //owner_id
    "BillingStreet": "4341 INTERNATIONAL PKWY STE 102",
    "BillingCity": "HAPEVILLE",
    "BillingState": "GA",
    "BillingCountry": "US",
    "BillingPostalCode": "30354",
    "Bill_To_Only__c": true,
    "Controlling_Only__c": true,
    "Bill_To_Number__c": "AGCUSTATL",
    "Controlling_Number__c": "AGCUSTATL",
    "ParentId": "0015f00001Z8xlIAAR", //parent_id
    "RecordTypeId": "0125f000000iCFVAA2" //constant
}

6. send PATCH to Saleforecast API
https://omnilogistics.my.salesforce.com/services/data/v53.0/sobjects/Sales_Forecast_Detail__c/Unique_Id__c/AGAGCAGCUSTATLAGCUSTATL201804
example :
{
    "Name": "AG CUSTOMS BROKERAGE INC.(ATL) 2018 04",
    "Year__c": "2018",
    "Month__c": "04",
    "Date__c": "2018-04-01",
    "Total_Charge__c": "0",
    "Total_Cost__c": "2.05",
    "Sales_Forecast__c": "0015f00001Z99q6AAB" //child_id
}
