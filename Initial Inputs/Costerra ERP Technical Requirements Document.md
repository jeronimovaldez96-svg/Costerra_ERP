# **Technical Requirements Document: Costerra ERP**

**Project:** Costerra ERP (Local Desktop Application)

**Lead:** Product Manager & Lead Full-Stack Engineer

**Target:** Final Architecture & Functional Specification

## ---

**1\. Executive Summary**

Costerra ERP is a modern, offline-first, locally hosted Enterprise Resource Planning system built for a scaling startup. It operates entirely on the user's local machine without cloud dependencies, ensuring absolute data privacy, zero latency, and no recurring hosting fees. The system acts as the central hub for Product Information Management (PIM), Purchasing, First-In-First-Out (FIFO) Inventory tracking, Client Relationship Management (CRM), Quoting, and Financial Analytics.

## **2\. System Architecture & Engineering Standards**

* **Framework:** Electron.js (Native Desktop App for Windows/Mac/Linux).

* **Frontend:** React.js with TypeScript and Tailwind CSS (Strictly tokenized UI: no hardcoded design values).  
* **Database:** SQLite (Serverless, single .db file for easy backups) managed via Prisma ORM.  
* **Asset Storage:** Local File System (Node.js fs), storing images within a hidden application directory (appData/costerra/assets/).  
* **Engineering Principles:** \* Strict separation of concerns (UI, Logic, Data).  
  * Immutability and append-only database records (Chesterton's Fence rule).  
  * ACID-compliant database transactions for all financial/inventory state mutations.  
  * Early-return patterns for robust, centralized error handling.

## ---

**3\. Functional Requirements by Module**

### **3.1 Product Information Management (PIM)**

* **Product Creation:** Users can create individual SKUs containing: Auto-generated SKU Number, Product Group, Product Family, Name, Color, Reference Image (local file upload), Default Unit Cost, and Default Unit Price.  
* **Product Modification:** All base data points (except the primary key SKU Number) can be modified. Modifications are non-destructive and trigger an insertion into a ProductHistory table for auditability.  
* **Product Neutralization:** Products can be disabled via an is\_active toggle, removing them from the quoting engine without deleting historical sales data.  
* **Data Views & Export:** All product data is viewable in a single, filterable, scrollable React \<DataTable /\> and can be exported to .xlsx natively.

### **3.2 Order Management & Purchasing**

* **Supplier Management:** Track vendor details (Name, Contact, Phone, Email) via a lightweight Supplier table.  
* **Purchase Orders (POs):** Create orders for specific SKUs defining unit quantity and actual unit cost.  
* **Order Tracking:** State machine limits PO status to DRAFT \-\> IN\_TRANSIT \-\> DELIVERED.

### **3.3 Inventory Ledger & FIFO Stock Tracking**

* **Double-Entry Ledger:** Inventory is not a flat number. Receiving a PO creates an InventoryBatch (FIFO ledger entry).  
* **Stock Behaviors:** \* *Delivered:* Adds new batches to stock.  
  * *Quoted:* Transfers quantity from Available to Reserved.  
  * *Sold:* Deducts permanently from Reserved.  
* **Data Views:** View current units per SKU, unit cost, and dynamically calculated total stock value (SUM(remaining\_qty \* unit\_cost)). Exportable to .xlsx.

### **3.4 Client Relationship Management (CRM)**

* **Client Profiles:** Auto-generated Client Number, Name, Surname, Address, City, Zip Code, Phone, and Notes. Edits are tracked historically.  
* **Client Hub:** A unified view to access a client's specific Sales Leads, complete Purchase History (Revenue & Cost), and generated Quotes.  
* **Reporting:** Download full purchase history reports and complete lead/quote status reports per client.

### **3.5 Sales Lead Generation**

* **Lead Tracking:** Create named opportunities (e.g., "Summer Restock") with an auto-generated ID.  
* **Status Workflow:** Default IN\_PROGRESS. Modifiable to SOLD or NOT\_SOLD.  
* **Lead Hub:** Houses all Quotes associated with the specific sales process. Exportable to .xlsx.

### **3.6 Quote Generation Engine**

* **Creation:** Quotes are children of Leads. Auto-generated Quote Number.  
* **Quoting Logic:** Add multiple SKUs and quantities. The system pulls default pricing/costs, but allows manual line-item overrides that do not affect the master product data.  
* **Document Generation:** Print-to-PDF functionality utilizing @media print CSS for client-ready documents containing SKU names, reference images, quantities, and totals (hiding internal costs).

### **3.7 Sales Execution Transaction**

* **ACID Protocol:** Formalizing a quote into a sale runs a strict, atomic database transaction.  
* **Pre-flight Checks:** Verifies stock availability before execution. Throws an error (early return) if requested quantity exceeds available stock.  
* **FIFO Deduction:** Iterates through oldest InventoryBatch records sequentially, deducting stock and calculating the mathematically pure, blended unit cost for the sale.  
* **Execution:** Marks Quote as SOLD, deducts stock, and creates a Sale and SaleLineItem ledger entry. Rolls back entirely if any step fails.

### **3.8 Financial Analytics & Sales Tracking**

* **Master Dashboard:** Visualizes total current stock value, Year-to-Date (YTD) Revenue, and Blended Profit Margin ((Total Value \- Total Cost) / Total Value \* 100).  
* **Reporting View:** A scrollable ledger of all formal sales detailing Date, Units Sold, Unit Price, Total Value, Total Cost, Profit ($), and Profit Margin. Exportable to .xlsx.

### **3.9 System Operations (Backup & Disaster Recovery)**

* **Database Locking:** Triggering a backup immediately blocks API POST/PUT/DELETE requests to prevent data corruption during the copy.  
* **Compression:** Packages the single SQLite costerra.db file and the assets/ image directory into a unified .zip archive via Node.js.  
* **Restoration:** The system accepts an uploaded .zip backup, replaces the active database and image directories, and reloads the application state, guaranteeing full data portability between local machines.

## ---

**4\. Pre-Deployment Integrity Check**

1. \[x\] **Integrity:** The architecture maintains strict data hygiene via ACID transactions and double-entry inventory ledgers.  
2. \[x\] **Cleanliness:** No placeholder logic exists; edge cases (like multi-batch FIFO deduction) are mathematically solved.  
3. \[x\] **Visuals:** UI architecture is strictly componentized and token-driven.  
4. \[x\] **The Fence:** Historical data (Products, Clients) uses append-only history and soft-deletes to protect past financial records.  
5. \[x\] **Explainability:** Business logic, data fetching, and UI rendering are distinctly separated and clearly documented.

### 