// ────────────────────────────────────────────────────────
// Costerra ERP — Root Application Component
// Defines the app layout shell and client-side routing.
// ────────────────────────────────────────────────────────

import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import ToastContainer from './components/ui/ToastContainer'
import ErrorBoundary from './components/ui/ErrorBoundary'
import DashboardPage from './pages/dashboard/DashboardPage'
import ProductsPage from './pages/products/ProductsPage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import PurchaseOrdersPage from './pages/purchase-orders/PurchaseOrdersPage'
import InventoryPage from './pages/inventory/InventoryPage'
import ClientsPage from './pages/clients/ClientsPage'
import SalesLeadsPage from './pages/sales-leads/SalesLeadsPage'
import QuotesPage from './pages/quotes/QuotesPage'
import QuotePrintTemplate from './pages/quotes/QuotePrintTemplate'
import SalesPage from './pages/sales/SalesPage'
import SettingsPage from './pages/settings/SettingsPage'

export default function App() {
    return (
        <div className="flex h-screen w-screen overflow-hidden">
            {/* ─── Sidebar Navigation ───────────────────────── */}
            <Sidebar />

            {/* ─── Main Content Area ────────────────────────── */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar />

                <main className="flex-1 overflow-y-auto p-6">
                    <ErrorBoundary>
                        <AnimatePresence mode="wait">
                            <Routes>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<DashboardPage />} />
                                <Route path="/products/*" element={<ProductsPage />} />
                                <Route path="/suppliers/*" element={<SuppliersPage />} />
                                <Route path="/purchase-orders/*" element={<PurchaseOrdersPage />} />
                                <Route path="/inventory" element={<InventoryPage />} />
                                <Route path="/clients/*" element={<ClientsPage />} />
                                <Route path="/sales-leads/*" element={<SalesLeadsPage />} />
                                <Route path="/quotes/*" element={<QuotesPage />} />
                                <Route path="/print/quote/:id" element={<QuotePrintTemplate />} />
                                <Route path="/sales/*" element={<SalesPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                            </Routes>
                        </AnimatePresence>
                    </ErrorBoundary>
                </main>
            </div>

            {/* ─── Global Toast Notifications ───────────────── */}
            <ToastContainer />
        </div>
    )
}

