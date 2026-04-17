"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupGuide() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">⚡ Quick Setup Guide</h1>
        <p className="page-description">Fix wallet persistence in 2 minutes</p>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Problem Alert */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-red-700 mb-2">🚨 Issue Detected</h2>
          <p className="text-gray-700">Your wallets are not persisting because <strong>Firestore security rules are not deployed</strong>.</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="space-y-4">
            <div className={`flex items-start gap-4 p-4 rounded ${step === 1 ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 1 ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-2">Deploy Firestore Rules</h3>
                <p className="text-sm text-gray-600 mb-3">Open PowerShell/Terminal and run:</p>
                <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm mb-3">
                  <div className="mb-2"># Login first (if needed)</div>
                  <div className="mb-2">firebase login</div>
                  <div className="mb-2"></div>
                  <div># Deploy the rules</div>
                  <div>firebase deploy --only firestore:rules</div>
                </div>
                <button 
                  className="btn-primary btn-sm"
                  onClick={() => setStep(2)}
                >
                  ✅ I&apos;ve deployed the rules
                </button>
              </div>
            </div>

            <div className={`flex items-start gap-4 p-4 rounded ${step === 2 ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-2">Clean Old Data (Optional)</h3>
                <p className="text-sm text-gray-600 mb-3">Remove conflicting old wallet data</p>
                <button 
                  className="btn-outline btn-sm mr-2"
                  onClick={() => router.push('/cleanup')}
                  disabled={step < 2}
                >
                  Go to Cleanup Tool
                </button>
                <button 
                  className="btn-text btn-sm"
                  onClick={() => setStep(3)}
                  disabled={step < 2}
                >
                  Skip →
                </button>
              </div>
            </div>

            <div className={`flex items-start gap-4 p-4 rounded ${step === 3 ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
                3
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-2">Test Firestore Connection</h3>
                <p className="text-sm text-gray-600 mb-3">Verify everything is working</p>
                <button 
                  className="btn-outline btn-sm"
                  onClick={() => router.push('/test-firestore')}
                  disabled={step < 3}
                >
                  Run Connection Test
                </button>
              </div>
            </div>

            <div className={`flex items-start gap-4 p-4 rounded ${step === 4 ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 4 ? 'bg-green-500 text-white' : 'bg-gray-300'}`}>
                4
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-2">Create a Wallet & Test</h3>
                <p className="text-sm text-gray-600 mb-3">Try creating a wallet and logging back in</p>
                <button 
                  className="btn-primary btn-sm"
                  onClick={() => router.push('/')}
                  disabled={step < 3}
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Alternative Method */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-bold mb-3">🔧 Alternative: Manual Setup</h3>
          <p className="text-sm text-gray-700 mb-3">If Firebase CLI doesn&apos;t work, you can deploy rules manually:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 mb-4">
            <li>Go to <a href="https://console.firebase.google.com/project/crypto-wallet-c4c06/firestore/rules" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Firebase Console</a></li>
            <li>Click Firestore Database → Rules tab</li>
            <li>Copy the rules from <code className="bg-gray-200 px-2 py-1 rounded">firestore.rules</code> file</li>
            <li>Paste and click &quot;Publish&quot;</li>
          </ol>
          <a 
            href="https://console.firebase.google.com/project/crypto-wallet-c4c06/firestore/rules" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-outline btn-sm"
          >
            Open Firebase Console →
          </a>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex gap-3 justify-center">
          <button 
            className="btn-text"
            onClick={() => router.push('/')}
          >
            ← Back to Dashboard
          </button>
          <button 
            className="btn-text"
            onClick={() => window.open('/WALLET_FIX_GUIDE.md', '_blank')}
          >
            📖 Full Guide
          </button>
        </div>
      </div>
    </div>
  );
}
