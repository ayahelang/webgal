/** Jumat: lempar kartu 3D — tiap kartu punya karakter gerakan berbeda */
function flyThrowMode(cards, stack) {
  playWhoosh(false);

  const mobile = window.innerWidth < 700;

  // Waktu dasar dibuat cukup panjang agar perbedaan antar kartu terlihat natural
  const baseDuration = 1250 + Math.random() * 250;

  const starts = cards.map((c, i) => {
    // Masing-masing kartu mempunyai delay berbeda.
    // Kartu berikutnya tidak langsung mengikuti kartu sebelumnya.
    const delay =
      i === 0
        ? Math.random() * 0.08
        : 0.08 + i * (0.07 + Math.random() * 0.08);

    // Jarak terbang tiap kartu berbeda
    const distanceX =
      (Math.random() * 2 - 1) * (mobile ? 90 : 175);

    const distanceY =
      (Math.random() * 2 - 1) * (mobile ? 70 : 135);

    // Kecepatan/tempo tiap kartu berbeda
    const speedFactor = 0.82 + Math.random() * 0.38;

    // Durasi keluar dan pulang sengaja berbeda
    const outDuration =
      (baseDuration * (0.40 + Math.random() * 0.10)) /
      speedFactor;

    const returnDuration =
      (baseDuration * (0.52 + Math.random() * 0.14)) /
      speedFactor;

    return {
      el: c,

      // Posisi awal
      x: 0,
      y: 0,

      // Target terbang
      dx: distanceX,
      dy: distanceY,

      // Rotasi berbeda
      rz: (Math.random() * 2 - 1) * 55,
      rx: (Math.random() * 2 - 1) * 42,
      ry: (Math.random() * 2 - 1) * 58,

      // Skala berbeda
      scale: 0.82 + Math.random() * 0.42,

      // Urutan visual berbeda
      z: Math.floor(Math.random() * 40),

      // Waktu masing-masing kartu
      delay,
      outDuration,
      returnDuration,

      // Kecepatan awal berbeda
      velocityBoost: 1.0 + Math.random() * 0.55,

      // Sedikit lengkungan jalur
      curveX: (Math.random() * 2 - 1) * (mobile ? 28 : 55),
      curveY: (Math.random() * 2 - 1) * (mobile ? 22 : 40),

      // Easing berbeda
      easeOut:
        easingsHard[
          Math.floor(Math.random() * easingsHard.length)
        ],

      easeReturn:
        easingsSoft[
          Math.floor(Math.random() * easingsSoft.length)
        ],

      finished: false,
    };
  });

  // Waktu mulai keseluruhan
  const t0 = performance.now();

  // Posisi tengah pergantian thumbnail
  const maxDelay = Math.max(...starts.map((s) => s.delay));
  const maxOut = Math.max(...starts.map((s) => s.outDuration));
  const midSwap =
    maxDelay + maxOut * (0.62 + Math.random() * 0.12);

  let swapped = false;

  function frame(now) {
    const elapsed = now - t0;

    let allFinished = true;

    starts.forEach((s) => {
      // Delay masing-masing kartu
      const localElapsed = elapsed - s.delay * baseDuration;

      if (localElapsed <= 0) {
        // Belum mulai
        s.el.style.transform =
          "translate3d(0px,0px,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)";

        allFinished = false;
        return;
      }

      const totalCardDuration =
        s.outDuration + s.returnDuration;

      if (localElapsed < s.outDuration) {
        // ==========================================
        // FASE 1 — TERBANG KELUAR
        // ==========================================

        const p = Math.min(
          1,
          localElapsed / s.outDuration
        );

        const e = s.easeOut(p);

        // Sedikit variasi jalur supaya tidak seperti
        // tiga kartu memakai garis lurus yang sama
        const curve =
          Math.sin(p * Math.PI) * (1 - p * 0.25);

        s.x =
          s.dx * e +
          s.curveX * curve;

        s.y =
          s.dy * e +
          s.curveY * curve;

        // Rotasi berkembang berbeda sesuai kartu
        const rz = s.rz * e;
        const rx = s.rx * e;
        const ry = s.ry * e;

        // Efek scale
        const scale =
          1 + (s.scale - 1) * e;

        s.el.style.zIndex =
          String(10 + s.z);

        s.el.style.transform =
          "translate3d(" +
          s.x.toFixed(2) +
          "px," +
          s.y.toFixed(2) +
          "px,0) rotateX(" +
          rx.toFixed(2) +
          "deg) rotateY(" +
          ry.toFixed(2) +
          "deg) rotateZ(" +
          rz.toFixed(2) +
          "deg) scale(" +
          scale.toFixed(3) +
          ")";

        allFinished = false;
        return;
      }

      // ==========================================
      // FASE 2 — KEMBALI KE POSISI AWAL
      // ==========================================

      const returnElapsed =
        localElapsed - s.outDuration;

      const p = Math.min(
        1,
        returnElapsed / s.returnDuration
      );

      const e = s.easeReturn(p);

      /*
       * Sangat penting:
       * posisi pulang dihitung dari posisi TERAKHIR
       * menuju 0, bukan langsung menghapus transform.
       *
       * Jadi kartu benar-benar terbang kembali
       * ke posisi semula.
       */

      const returnCurve =
        Math.sin(p * Math.PI) *
        (1 - p) *
        0.18;

      s.x =
        s.dx * (1 - e) +
        s.curveX * returnCurve;

      s.y =
        s.dy * (1 - e) +
        s.curveY * returnCurve;

      // Rotasi juga dikembalikan perlahan
      const rz =
        s.rz * (1 - e);

      const rx =
        s.rx * (1 - e);

      const ry =
        s.ry * (1 - e);

      const scale =
        1 +
        (s.scale - 1) * (1 - e);

      s.el.style.zIndex =
        String(10 + s.z);

      s.el.style.transform =
        "translate3d(" +
        s.x.toFixed(2) +
        "px," +
        s.y.toFixed(2) +
        "px,0) rotateX(" +
        rx.toFixed(2) +
        "deg) rotateY(" +
        ry.toFixed(2) +
        "deg) rotateZ(" +
        rz.toFixed(2) +
        "deg) scale(" +
        scale.toFixed(3) +
        ")";

      if (p < 1) {
        allFinished = false;
      } else {
        /*
         * Jangan langsung menghapus transform sebelum
         * posisi benar-benar sudah kembali.
         */
        s.x = 0;
        s.y = 0;
        s.finished = true;

        s.el.style.transform =
          "translate3d(0px,0px,0) " +
          "rotateX(0deg) " +
          "rotateY(0deg) " +
          "rotateZ(0deg) scale(1)";
      }
    });

    // Pergantian isi kartu tetap terjadi ketika animasi
    // sedang berlangsung, tetapi waktunya tidak selalu sama.
    if (!swapped && elapsed >= midSwap * 1.0) {
      swapped = true;
      applyRandomContent();
      playWhoosh(false);
    }

    if (!allFinished) {
      requestAnimationFrame(frame);
    } else {
      // Beri sedikit kesempatan agar frame terakhir
      // benar-benar ter-render sebelum cleanup.
      requestAnimationFrame(() => {
        finish(cards, stack, starts);
      });
    }
  }

  requestAnimationFrame(frame);
}


/** Hari biasa: daun/kartu melayang dengan karakter masing-masing */
function flyLeafMode(cards, stack) {
  playWhoosh(true);

  const mobile = window.innerWidth < 700;

  const baseDuration =
    3600 + Math.random() * 1000;

  const leftBias =
    mobile ? -200 : -340;

  const topBias =
    mobile ? -110 : -180;

  const spanX =
    mobile ? 90 : 140;

  const spanY =
    mobile ? 80 : 120;

  const states = cards.map((c, i) => {
    // Jarak tiap kartu benar-benar berbeda
    const tx =
      leftBias +
      (Math.random() * 2 - 1) *
        spanX *
        (0.45 + Math.random() * 0.35) +
      i * (mobile ? -18 : -28);

    const ty =
      topBias +
      Math.random() * spanY * 0.75 +
      (Math.random() * 2 - 1) * 30;

    // Arah awal berbeda
    const ang =
      Math.atan2(ty, tx) +
      (Math.random() * 2 - 1) * 0.65;

    // Kecepatan awal berbeda
    const speed =
      (mobile ? 7.5 : 11) +
      Math.random() *
        (mobile ? 8 : 13);

    // Setiap kartu mempunyai tempo berbeda
    const speedFactor =
      0.82 + Math.random() * 0.42;

    // Delay berbeda
    const delay =
      i === 0
        ? Math.random() * 0.04
        : 0.04 +
          i * (0.045 + Math.random() * 0.07);

    // Fase puncak berbeda sedikit
    const peak =
      0.36 + Math.random() * 0.12;

    return {
      el: c,

      x: 0,
      y: 0,

      tx,
      ty,

      rz:
        (Math.random() * 2 - 1) * 46,

      rx:
        (Math.random() * 2 - 1) * 15,

      ry:
        (Math.random() * 2 - 1) * 19,

      phase:
        Math.random() * Math.PI * 2,

      wobbleAmp:
        16 + Math.random() * 28,

      delay,

      peak,

      z:
        14 + i + Math.floor(Math.random() * 10),

      w:
        c.offsetWidth || 240,

      h:
        c.offsetHeight || 160,

      hw:
        (c.offsetWidth || 240) * 0.48,

      hh:
        (c.offsetHeight || 160) * 0.48,

      vx:
        Math.cos(ang) *
        speed *
        speedFactor,

      vy:
        Math.sin(ang) *
        speed *
        speedFactor,

      // Kecepatan maksimum awal berbeda
      initialSpeed:
        speed * speedFactor,

      // Damping berbeda sedikit
      drag:
        0.91 + Math.random() * 0.045,

      // Spring berbeda
      spring:
        0.055 + Math.random() * 0.035,

      returnSpring:
        0.10 + Math.random() * 0.055,

      // Jalur pulang berbeda
      returnCurveX:
        (Math.random() * 2 - 1) * 32,

      returnCurveY:
        (Math.random() * 2 - 1) * 24,

      finished: false,
    };
  });


  /*
   * Collision tetap digunakan agar kartu tidak saling
   * menusuk ketika jalurnya berpotongan.
   */
  function collideResolve(now) {
    let bumped = false;

    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const a = states[i];
        const b = states[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const ox =
          a.hw +
          b.hw -
          Math.abs(dx);

        const oy =
          a.hh +
          b.hh -
          Math.abs(dy);

        if (ox > 0 && oy > 0) {
          if (ox < oy) {
            const sx =
              dx < 0 ? -1 : 1;

            const push =
              ox * 0.55;

            a.x -= sx * push;
            b.x += sx * push;

            const relVx =
              a.vx - b.vx;

            if (relVx * sx > 0) {
              const impulse =
                relVx * 0.35;

              a.vx -=
                impulse * sx;

              b.vx +=
                impulse * sx;
            }

            a.vx -=
              sx *
              (0.6 + Math.random() * 0.7);

            b.vx +=
              sx *
              (0.6 + Math.random() * 0.7);
          } else {
            const sy =
              dy < 0 ? -1 : 1;

            const push =
              oy * 0.55;

            a.y -= sy * push;
            b.y += sy * push;

            const relVy =
              a.vy - b.vy;

            if (relVy * sy > 0) {
              const impulse =
                relVy * 0.35;

              a.vy -=
                impulse * sy;

              b.vy +=
                impulse * sy;
            }

            a.vy -=
              sy *
              (0.6 + Math.random() * 0.7);

            b.vy +=
              sy *
              (0.6 + Math.random() * 0.7);
          }

          bumped = true;
        }
      }
    }

    if (
      bumped &&
      now - lastBump > 160
    ) {
      playLeafBump();
      lastBump = now;
    }
  }


  const t0 =
    performance.now();

  let lastBump = 0;

  let swapped = false;

  // Pergantian konten tidak tepat di tengah untuk semua
  const midSwap =
    0.32 + Math.random() * 0.18;


  function frame(now) {
    const elapsed =
      now - t0;

    let allFinished = true;

    states.forEach((s) => {
      /*
       * Delay setiap kartu dihitung secara independen.
       */
      const localTime =
        elapsed -
        s.delay * baseDuration;

      if (localTime <= 0) {
        allFinished = false;
        return;
      }

      /*
       * local = 0 → 1
       */
      const local =
        Math.min(
          1,
          localTime /
            (baseDuration *
              (0.92 +
                Math.random() * 0.02))
        );

      /*
       * ------------------------------------------
       * FASE TERBANG AWAL
       * ------------------------------------------
       */

      if (local < s.peak) {
        const phase =
          local / s.peak;

        const env =
          easeOutSine(phase);

        // Drag berbeda setiap kartu
        s.vx *= s.drag;
        s.vy *= s.drag;

        // Tarikan menuju target
        s.vx +=
          (s.tx - s.x) *
          s.spring;

        s.vy +=
          (s.ty - s.y) *
          s.spring;

        // Kecepatan awal masih dominan
        const boost =
          1 +
          (1 - phase) *
          0.035;

        s.x +=
          s.vx *
          boost;

        s.y +=
          s.vy *
          boost;

        allFinished = false;
      } else {
        /*
         * ------------------------------------------
         * FASE PULANG
         * ------------------------------------------
         *
         * Tidak langsung mengubah transform menjadi
         * kosong. Kartu ditarik perlahan menuju 0,0.
         */

        const returnP =
          (local - s.peak) /
          (1 - s.peak);

        const e =
          easeInOutCubic(
            Math.min(1, returnP)
          );

        // Target pulang
        const targetX =
          s.returnCurveX *
          Math.sin(
            returnP * Math.PI
          ) *
          (1 - e) +
          s.tx *
          (1 - e);

        const targetY =
          s.returnCurveY *
          Math.sin(
            returnP * Math.PI
          ) *
          (1 - e) +
          s.ty *
          (1 - e);

        /*
         * Soft spring menuju posisi semula.
         * Masing-masing kartu memiliki spring berbeda.
         */
        s.vx *= 0.82;
        s.vy *= 0.82;

        s.x +=
          (targetX - s.x) *
          s.returnSpring;

        s.y +=
          (targetY - s.y) *
          s.returnSpring;

        /*
         * Mendekati akhir, paksa secara sangat lembut
         * menuju 0 agar tidak menyisakan beberapa pixel.
         */
        if (returnP > 0.88) {
          const snapSoft =
            (returnP - 0.88) /
            0.12;

          s.x *=
            1 -
            snapSoft * 0.20;

          s.y *=
            1 -
            snapSoft * 0.20;
        }

        if (
          returnP < 1 ||
          Math.abs(s.x) > 0.5 ||
          Math.abs(s.y) > 0.5
        ) {
          allFinished = false;
        }
      }
    });


    collideResolve(now);


    /*
     * Render kartu setelah collision.
     */
    states.forEach((s) => {
      const elapsedLocal =
        Math.max(
          0,
          elapsed -
            s.delay * baseDuration
        );

      const local =
        Math.min(
          1,
          elapsedLocal /
            (baseDuration * 0.94)
        );

      let env;

      if (local < s.peak) {
        env =
          easeOutSine(
            local / s.peak
          );
      } else {
        env =
          1 -
          easeInOutCubic(
            (local - s.peak) /
              (1 - s.peak)
          );
      }

      /*
       * Rotasi meliuk tidak seragam.
       */
      const rotZ =
        s.rz * env +
        Math.sin(
          local *
            Math.PI *
            (2.8 +
              s.initialSpeed *
              0.015) +
            s.phase
        ) *
          14 *
          env +
        Math.sin(
          local *
            Math.PI *
            5.0 +
            s.phase *
            0.7
        ) *
          5 *
          env;

      const rotX =
        s.rx * env +
        Math.cos(
          local *
            Math.PI *
            2.2 +
            s.phase
        ) *
          6 *
          env;

      const rotY =
        s.ry * env +
        Math.sin(
          local *
            Math.PI *
            2.7 +
            s.phase *
            1.2
        ) *
          7 *
          env;

      s.el.style.zIndex =
        String(
          30 +
            Math.round(
              12 -
                s.y * 0.025 +
                s.z
            )
        );

      s.el.style.transform =
        "translate3d(" +
        s.x.toFixed(2) +
        "px," +
        s.y.toFixed(2) +
        "px,0) rotateX(" +
        rotX.toFixed(2) +
        "deg) rotateY(" +
        rotY.toFixed(2) +
        "deg) rotateZ(" +
        rotZ.toFixed(2) +
        "deg) scale(" +
        (1 + 0.05 * env).toFixed(3) +
        ")";
    });


    /*
     * Ganti thumbnail saat kartu sudah cukup jauh
     * bergerak. Tidak harus tepat bersamaan dengan
     * titik tengah animasi.
     */
    if (
      !swapped &&
      elapsed >=
        midSwap * baseDuration
    ) {
      swapped = true;
      applyRandomContent();
      playWhoosh(true);
    }


    if (!allFinished) {
      requestAnimationFrame(frame);
    } else {
      /*
       * Tunggu satu frame lagi agar posisi 0,0
       * benar-benar terlihat sebelum cleanup.
       */
      requestAnimationFrame(() => {
        states.forEach((s) => {
          s.x = 0;
          s.y = 0;
          s.vx = 0;
          s.vy = 0;
        });

        finish(
          cards,
          stack,
          states
        );
      });
    }
  }

  requestAnimationFrame(frame);
}


/**
 * Cleanup setelah animasi.
 *
 * Penting:
 * - Tidak langsung membuat kartu "teleport".
 * - Posisi dan transform dinormalisasi.
 * - Velocity dihentikan.
 */
function finish(cards, stack, states) {
  if (states && states.length) {
    states.forEach((s) => {
      if (!s || !s.el) return;

      s.x = 0;
      s.y = 0;

      if ("vx" in s) s.vx = 0;
      if ("vy" in s) s.vy = 0;

      s.finished = true;

      /*
       * Posisi sudah 0,0 terlebih dahulu.
       * Setelah itu baru transform dikosongkan.
       */
      s.el.style.transform =
        "translate3d(0px,0px,0) " +
        "rotateX(0deg) " +
        "rotateY(0deg) " +
        "rotateZ(0deg) scale(1)";

      s.el.style.zIndex = "";
    });
  } else if (cards) {
    cards.forEach((el) => {
      if (!el) return;

      el.style.transform =
        "translate3d(0px,0px,0) " +
        "rotateX(0deg) " +
        "rotateY(0deg) " +
        "rotateZ(0deg) scale(1)";

      el.style.zIndex = "";
    });
  }

  if (stack) {
    stack.classList.remove(
      "is-flying",
      "is-leaf"
    );
  }

  flying = false;
}
