import { Navigate } from 'react-router-dom';

/** ใช้หน้าเติมเกมหลักที่ /marketplace แทน */
export function Topups() {
  return <Navigate to="/marketplace" replace />;
}
