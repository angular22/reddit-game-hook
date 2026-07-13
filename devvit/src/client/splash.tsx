import './index.css';

import { navigateTo, context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import qokahLogo from '../../assets/qokah-logo.png';

export const Splash = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#020617_60%)] p-6 text-center text-slate-100">
      <img
        src={qokahLogo}
        alt="QOKAH"
        className="mb-6 h-auto w-full max-w-xs drop-shadow-[0_0_30px_rgba(217,70,239,0.35)]"
      />
      <h1 className="mb-2 text-2xl font-black tracking-tight">
        <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
          QOKAH
        </span>
      </h1>
      <p className="mb-6 max-w-xs text-sm text-slate-400">
        Your selfie becomes a cosmic warrior. Fight aliens, unlock hidden powers, and come back tomorrow to use them.
      </p>
      <button
        className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-8 py-3 font-bold text-white shadow-lg hover:opacity-90"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Tap to Start
      </button>
      <p className="mt-4 text-xs text-slate-500">Hello {context.username ?? 'Warrior'} 👋</p>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
