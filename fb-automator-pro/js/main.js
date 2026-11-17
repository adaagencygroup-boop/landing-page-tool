/* =============================================================================
   FB Automator Pro — Xử lý tương tác cho landing page
   JavaScript thuần ES6+. Không framework, không build step.
   -----------------------------------------------------------------------------
   01. Khởi tạo / dò khả năng trình duyệt
   02. Icon (Lucide)
   03. Trạng thái header dính
   04. Menu điều hướng trên di động
   05. Cuộn mượt, bù trừ chiều cao header
   06. Tự làm nổi mục menu theo vị trí cuộn
   07. Hiệu ứng hiện dần khi cuộn (IntersectionObserver)
   08. Đếm số tăng dần cho chỉ số và thống kê
   09. Thanh tiến độ
   10. Accordion Hỏi đáp
   11. Hiệu ứng thị sai cho các thẻ nổi
   ========================================================================== */

(function () {
  "use strict";

  /* ==========================================================================
     01. KHỞI TẠO / DÒ KHẢ NĂNG TRÌNH DUYỆT
     ====================================================================== */
  const root = document.documentElement;
  root.classList.remove("no-js");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /** Gom nhiều lần gọi liên tiếp về một lần chạy ở khung hình kế tiếp. */
  function rafThrottle(fn) {
    let queued = false;
    return function throttled(...args) {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        fn.apply(this, args);
      });
    };
  }

  /* ==========================================================================
     02. ICON (Lucide)
     Vẽ mọi ô giữ chỗ [data-lucide]. Gọi lại sau khi chèn thêm DOM có icon.
     ====================================================================== */
  function renderIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  /* ==========================================================================
     03. TRẠNG THÁI HEADER DÍNH
     ====================================================================== */
  const header = $("#header");

  const updateHeader = rafThrottle(() => {
    if (!header) return;
    header.classList.toggle("is-stuck", window.scrollY > 8);
  });

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  function headerHeight() {
    return header ? header.getBoundingClientRect().height : 0;
  }

  /* ==========================================================================
     04. MENU ĐIỀU HƯỚNG TRÊN DI ĐỘNG
     ====================================================================== */
  const navToggle = $("#nav-toggle");
  const drawer = $("#drawer");

  function openDrawer() {
    if (!drawer || !navToggle) return;
    drawer.hidden = false;
    // Đợi khung hình kế tiếp để hiệu ứng chạy từ trạng thái ẩn.
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Đóng menu");
    document.body.classList.add("is-locked");
  }

  function closeDrawer() {
    if (!drawer || !navToggle) return;
    drawer.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Mở menu");
    document.body.classList.remove("is-locked");

    const hide = () => {
      if (!drawer.classList.contains("is-open")) drawer.hidden = true;
    };
    if (prefersReducedMotion) hide();
    else window.setTimeout(hide, 260);
  }

  function isDrawerOpen() {
    return !!drawer && drawer.classList.contains("is-open");
  }

  if (navToggle && drawer) {
    navToggle.addEventListener("click", () => {
      isDrawerOpen() ? closeDrawer() : openDrawer();
    });

    // Bấm vào bất kỳ link nào trong menu thì đóng menu, rồi mới cuộn.
    drawer.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeDrawer();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isDrawerOpen()) {
        closeDrawer();
        navToggle.focus();
      }
    });

    // Không bao giờ để menu mở khi bố cục chuyển sang desktop.
    const desktop = window.matchMedia("(min-width: 60rem)");
    const onBreakpoint = (event) => {
      if (event.matches && isDrawerOpen()) closeDrawer();
    };
    if (typeof desktop.addEventListener === "function") {
      desktop.addEventListener("change", onBreakpoint);
    } else if (typeof desktop.addListener === "function") {
      desktop.addListener(onBreakpoint);
    }
  }

  /* ==========================================================================
     05. CUỘN MƯỢT, BÙ TRỪ CHIỀU CAO HEADER
     `scroll-behavior` của CSS lo phần lớn; đoạn này chỉnh lại điểm dừng để
     tiêu đề không bị header dính che mất.
     ====================================================================== */
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const hash = link.getAttribute("href");
    if (!hash || hash === "#") return;

    const target = document.getElementById(hash.slice(1));
    if (!target) return;

    event.preventDefault();

    const top =
      target.getBoundingClientRect().top + window.scrollY - headerHeight();

    window.scrollTo({
      top: Math.max(top, 0),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    // Giữ URL chia sẻ được mà không nhảy thêm lần nữa.
    if (history.replaceState) history.replaceState(null, "", hash);
  });

  /* ==========================================================================
     06. TỰ LÀM NỔI MỤC MENU THEO VỊ TRÍ CUỘN
     ====================================================================== */
  const navLinks = $$(".nav__link");
  const spyTargets = navLinks
    .map((link) => {
      const id = link.getAttribute("href");
      return id && id.startsWith("#") ? document.getElementById(id.slice(1)) : null;
    })
    .filter(Boolean);

  if (spyTargets.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          navLinks.forEach((link) =>
            link.classList.toggle("is-active", link.getAttribute("href") === id)
          );
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    spyTargets.forEach((section) => spy.observe(section));
  }

  /* ==========================================================================
     07. HIỆU ỨNG HIỆN DẦN KHI CUỘN
     Chỉ là lớp tăng cường: nếu đoạn này không chạy, nội dung vẫn hiển thị.
     ====================================================================== */
  const revealables = $$("[data-reveal]");

  function revealAll() {
    revealables.forEach((el) => el.classList.add("is-visible"));
  }

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    revealables.forEach((el) => revealObserver.observe(el));

    // Lưới an toàn: phần tử đã nằm trong khung nhìn lúc tải thì hiện ngay.
    requestAnimationFrame(() => {
      revealables.forEach((el) => {
        const box = el.getBoundingClientRect();
        if (box.top < window.innerHeight * 0.9) el.classList.add("is-visible");
      });
    });
  }

  /* ==========================================================================
     08. ĐẾM SỐ TĂNG DẦN
     Mọi [data-count] chạy từ 0 tới giá trị của nó khi cuộn tới.
     ====================================================================== */
  const counters = $$("[data-count]");
  const NUMBER_LOCALE = "vi-VN";

  function animateCount(el) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;

    const suffix = el.dataset.suffix || "";
    const duration = 1400;
    const start = performance.now();
    const format = (n) => n.toLocaleString(NUMBER_LOCALE);

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutExpo — tăng nhanh lúc đầu, hạ cánh nhẹ ở cuối.
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      el.textContent = format(Math.round(target * eased)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }

    el.textContent = `0${suffix}`;
    requestAnimationFrame(step);
  }

  if (counters.length) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      counters.forEach((el) => {
        const suffix = el.dataset.suffix || "";
        el.textContent =
          Number(el.dataset.count).toLocaleString(NUMBER_LOCALE) + suffix;
      });
    } else {
      const countObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            animateCount(entry.target);
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach((el) => countObserver.observe(el));
    }
  }

  /* ==========================================================================
     09. THANH TIẾN ĐỘ
     [data-bar="68"] sẽ chạy tới 68% khi lọt vào khung nhìn.
     ====================================================================== */
  const bars = $$("[data-bar]");

  function fillBar(bar) {
    const fill = bar.querySelector("i");
    if (!fill) return;
    const pct = Math.max(0, Math.min(100, Number(bar.dataset.bar) || 0));
    fill.style.width = `${pct}%`;
  }

  if (bars.length) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      bars.forEach(fillBar);
    } else {
      const barObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            // Lệch nhau một chút để cả nhóm đọc như một chuỗi liên tiếp.
            const delay = Number(entry.target.dataset.barDelay) || 0;
            window.setTimeout(() => fillBar(entry.target), 120 + delay);
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.4 }
      );
      bars.forEach((bar, i) => {
        bar.dataset.barDelay = String(i * 70);
        barObserver.observe(bar);
      });
    }
  }

  /* ==========================================================================
     10. ACCORDION HỎI ĐÁP
     Mỗi lúc chỉ mở một mục, trạng thái do aria-expanded quyết định.
     ====================================================================== */
  const faqList = $("#faq-list");

  if (faqList) {
    const triggers = $$(".faq__trigger", faqList);

    const setItemState = (trigger, open) => {
      const item = trigger.closest(".faq__item");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      if (item) item.classList.toggle("is-open", open);
    };

    triggers.forEach((trigger, index) => {
      trigger.addEventListener("click", () => {
        const willOpen = trigger.getAttribute("aria-expanded") !== "true";
        triggers.forEach((other) => setItemState(other, false));
        setItemState(trigger, willOpen);
      });

      // Di chuyển giữa các câu hỏi bằng phím mũi tên.
      trigger.addEventListener("keydown", (event) => {
        const keys = {
          ArrowDown: index + 1,
          ArrowUp: index - 1,
          Home: 0,
          End: triggers.length - 1,
        };
        if (!(event.key in keys)) return;
        event.preventDefault();
        const next = triggers[(keys[event.key] + triggers.length) % triggers.length];
        if (next) next.focus();
      });
    });

    // Mở sẵn câu đầu tiên để mục Hỏi đáp không trông như đang rỗng.
    if (triggers[0]) setItemState(triggers[0], true);
  }

  /* ==========================================================================
     11. HIỆU ỨNG THỊ SAI CHO CÁC THẺ NỔI
     Mỗi [data-float] có một hệ số độ sâu; CSS lo phần trôi nhẹ thường trực,
     đoạn này thêm phản hồi theo con trỏ và theo vị trí cuộn.
     ====================================================================== */
  const floats = $$("[data-float]");
  const stage = $(".hero__stage");

  if (floats.length && stage && !prefersReducedMotion) {
    const fine = window.matchMedia("(pointer: fine)").matches;
    let pointerX = 0;
    let pointerY = 0;
    let scrollShift = 0;

    const apply = rafThrottle(() => {
      floats.forEach((el) => {
        const depth = Number(el.dataset.float) || 0;
        const x = pointerX * depth * 26;
        const y = pointerY * depth * 20 + scrollShift * depth * 1.4;
        // Dịch chuyển ở lớp ngoài; keyframe của CSS lo translate3d bên trong.
        el.style.setProperty("translate", `${x.toFixed(2)}px ${y.toFixed(2)}px`);
      });
    });

    if (fine) {
      stage.addEventListener(
        "pointermove",
        (event) => {
          const box = stage.getBoundingClientRect();
          pointerX = (event.clientX - box.left) / box.width - 0.5;
          pointerY = (event.clientY - box.top) / box.height - 0.5;
          apply();
        },
        { passive: true }
      );

      stage.addEventListener("pointerleave", () => {
        pointerX = 0;
        pointerY = 0;
        apply();
      });
    }

    window.addEventListener(
      "scroll",
      rafThrottle(() => {
        const box = stage.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) return;
        scrollShift = (window.innerHeight / 2 - (box.top + box.height / 2)) * 0.06;
        apply();
      }),
      { passive: true }
    );
  }

  /* ==========================================================================
     12. FORM LIÊN HỆ — GHI THẳNG VÀO MỘT GOOGLE SHEET

     Mọi yêu cầu liên hệ đều đổ về cùng một Sheet qua Google Apps Script.
     Cách đấu nối (chi tiết trong README, mục "Nối form liên hệ với Google
     Sheet"):

       1. Tạo Google Sheet, vào Tiện ích mở rộng → Apps Script.
       2. Dán đoạn script trong README, bấm Triển khai → Ứng dụng web,
          quyền truy cập "Bất kỳ ai".
       3. Chép địa chỉ /exec nó trả về, dán vào SHEET_ENDPOINT ngay dưới.

     Để trống SHEET_ENDPOINT thì form vẫn kiểm tra dữ liệu và báo đã nhận,
     nhưng không gửi đi đâu cả.
     ====================================================================== */
  const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbxd_-2UgCedeGot7C_Huy-2jMvt2o-opMuNpes7S-KwJ3F7j3OyQ2EId1Mmq9mXHeb2iw/exec";

  const contactForm = document.getElementById("contact-form");

  if (contactForm) {
    const okNote = document.getElementById("contact-ok");
    const errNote = document.getElementById("contact-err");
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const submitLabel = contactForm.querySelector("[data-submit-label]");
    const submitText = submitLabel ? submitLabel.textContent : "";

    const fieldOf = (input) => input.closest(".field");

    function showError(input, show) {
      const wrap = fieldOf(input);
      if (wrap) wrap.classList.toggle("is-invalid", show);
      const note = contactForm.querySelector('[data-error-for="' + input.id + '"]');
      if (note) note.hidden = !show;
      input.setAttribute("aria-invalid", show ? "true" : "false");
    }

    function checkField(input) {
      const value = input.value.trim();

      if (input.required && !value) return false;

      if (input.type === "tel" && value) {
        // Chấp nhận khoảng trắng, dấu chấm, gạch ngang và tiền tố +84.
        const digits = value.replace(/[^0-9]/g, "");
        return digits.length >= 9 && digits.length <= 12;
      }

      return true;
    }

    const validated = $$("input, textarea", contactForm).filter(
      (el) => el.required || el.type === "tel"
    );

    validated.forEach((input) => {
      input.addEventListener("blur", () => showError(input, !checkField(input)));
      input.addEventListener("input", () => {
        const wrap = fieldOf(input);
        if (wrap && wrap.classList.contains("is-invalid") && checkField(input)) {
          showError(input, false);
        }
      });
    });

    function setSending(on) {
      contactForm.classList.toggle("is-sending", on);
      if (submitBtn) submitBtn.disabled = on;
      if (submitLabel) submitLabel.textContent = on ? "Đang gửi..." : submitText;
    }

    async function sendToSheet(data) {
      if (!SHEET_ENDPOINT) return true; // chưa đấu nối thì coi như xong

      const body = new URLSearchParams(data);

      // Apps Script không trả header CORS, nên dùng no-cors: trình duyệt vẫn
      // gửi được nhưng không đọc được phản hồi. Không ném lỗi là coi như đã ghi.
      await fetch(SHEET_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: body.toString(),
      });

      return true;
    }

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      let firstBad = null;
      validated.forEach((input) => {
        const bad = !checkField(input);
        showError(input, bad);
        if (bad && !firstBad) firstBad = input;
      });

      if (okNote) okNote.hidden = true;
      if (errNote) errNote.hidden = true;

      if (firstBad) {
        firstBad.focus();
        return;
      }

      const data = {
        name: contactForm.elements.name.value.trim(),
        phone: contactForm.elements.phone.value.trim(),
        message: contactForm.elements.message.value.trim(),
        page: location.href,
        sentAt: new Date().toISOString(),
      };

      setSending(true);

      try {
        await sendToSheet(data);
        if (okNote) okNote.hidden = false;
        contactForm.reset();
      } catch (err) {
        if (errNote) errNote.hidden = false;
      } finally {
        setSending(false);
        renderIcons();
      }
    });
  }

  /* ==========================================================================
     CHẠY KHI TRANG SẴN SÀNG
     ====================================================================== */
  function init() {
    renderIcons();

    // AOS là tùy chọn; observer tự viết ở trên đã lo cùng phần việc.
    if (window.AOS && typeof window.AOS.init === "function") {
      window.AOS.init({
        duration: 700,
        easing: "ease-out-cubic",
        once: true,
        offset: 60,
        disable: prefersReducedMotion,
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Script CDN dùng defer có thể về sau DOMContentLoaded — vẽ lại icon.
  window.addEventListener("load", renderIcons);
})();
