/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ErpProvider } from './context/ErpContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { AuthGuard } from './components/auth/AuthGuard';

export default function App() {
  return (
    <ErpProvider>
      <ConfirmProvider>
        <AuthGuard />
      </ConfirmProvider>
    </ErpProvider>
  );
}
