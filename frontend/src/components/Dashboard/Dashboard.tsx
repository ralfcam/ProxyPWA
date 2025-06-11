import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import DashboardLayout from './DashboardLayout'
import ProxyControl from './ProxyControl'
import Statistics from './Statistics'
import Settings from './Settings'
import Account from './Account'

const Dashboard = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard/proxy" replace />} />
        <Route path="/proxy" element={<ProxyControl />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<Navigate to="/dashboard/proxy" replace />} />
      </Routes>
    </DashboardLayout>
  )
}

export default Dashboard 