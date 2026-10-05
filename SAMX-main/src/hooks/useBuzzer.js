import { useEffect, useRef } from 'react';

/** ส่งเสียงเตือนซ้ำๆ เมื่อ active=true และยังไม่ mute */
export default function useBuzzer(active, muted) {
  const ctxRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const stop = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };

    if (!active || muted) {
      stop();
      return;
    }

    const beep = () => {
      try {
        if (!ctxRef.current) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          ctxRef.current = new AudioCtx();
        }
        const ctx = ctxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch (e) {
        /* เบราว์เซอร์บล็อกเสียงก่อนผู้ใช้คลิก — ข้ามไป */
      }
    };

    beep();
    timerRef.current = setInterval(beep, 1200);
    return stop;
  }, [active, muted]);
}