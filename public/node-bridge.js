(function () {
  function qs(selector) {
    return document.querySelector(selector);
  }

  function basename(pathname) {
    var last = pathname.split("/").pop() || "";
    return last.replace(/\.html?$/i, "");
  }

  function t(key) {
    var dict = {
      login_failed: "เข้าสู่ระบบไม่สำเร็จ",
      register_success: "สมัครสมาชิกสำเร็จ กำลังพาไปหน้าเข้าสู่ระบบ...",
      register_failed: "สมัครสมาชิกไม่สำเร็จ",
      target_required: "กรุณากรอกลิงก์เป้าหมาย",
      quantity_required: "กรุณากรอกจำนวน",
      order_created: "สร้างคำสั่งซื้อสำเร็จ: ",
      order_failed: "สร้างคำสั่งซื้อไม่สำเร็จ",
      auth_required: "กรุณาเข้าสู่ระบบก่อนใช้งาน",
    };
    return dict[key] || key;
  }

  function showMessage(text, ok) {
    var box = qs("#node-bridge-message");
    if (!box) {
      box = document.createElement("div");
      box.id = "node-bridge-message";
      box.style.position = "fixed";
      box.style.right = "20px";
      box.style.bottom = "20px";
      box.style.zIndex = "99999";
      box.style.maxWidth = "360px";
      box.style.padding = "14px 16px";
      box.style.borderRadius = "12px";
      box.style.color = "#fff";
      box.style.fontFamily = "Segoe UI, Arial, sans-serif";
      box.style.boxShadow = "0 10px 30px rgba(0,0,0,.2)";
      document.body.appendChild(box);
    }
    box.style.background = ok ? "#117b34" : "#b42318";
    box.textContent = text;
    setTimeout(function () {
      if (box) box.remove();
    }, 4500);
  }

  async function api(url, options) {
    var response = await fetch(url, Object.assign({ credentials: "same-origin" }, options || {}));
    var text = await response.text();
    var data;
    try {
      data = JSON.parse(text);
    } catch (_err) {
      data = { ok: response.ok, raw: text };
    }
    if (!response.ok || data.ok === false) {
      throw new Error(data.message || ("Request failed: " + response.status));
    }
    return data;
  }

  function formValue(name, fallbackSelector) {
    var field = document.querySelector("[name='" + name + "']") || (fallbackSelector ? qs(fallbackSelector) : null);
    return field ? field.value : "";
  }

  function setupLogin() {
    var form = qs("#form-auth");
    if (!form) return false;
    if (!/login/i.test(window.location.pathname)) return false;
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      try {
        await api("/api/auth/user/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formValue("name", "[name='username']"),
            password: formValue("password"),
          }),
        });
        window.location.href = "/";
      } catch (error) {
        showMessage(error.message || t("login_failed"), false);
      }
    });
    return true;
  }

  function setupRegister() {
    var form = qs("#form-auth");
    if (!form) return false;
    if (!/register/i.test(window.location.pathname)) return false;
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      try {
        await api("/api/auth/user/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formValue("name", "[name='username']"),
            full_name: formValue("name", "[name='full_name']"),
            email: formValue("email"),
            phone: formValue("phone"),
            password: formValue("password"),
          }),
        });
        showMessage(t("register_success"), true);
        setTimeout(function () {
          window.location.href = "/login.html";
        }, 1000);
      } catch (error) {
        showMessage(error.message || t("register_failed"), false);
      }
    });
    return true;
  }

  function setupOrder() {
    var form = qs("#form-create");
    if (!form) return false;
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      try {
        var pageSlug = basename(window.location.pathname);
        var map = await api("/api/frontend/page-map/" + encodeURIComponent(pageSlug));
        var product = map.product;
        var targetLink = formValue("post_link", "[name='target_link']");
        var quantity = Number(formValue("number_seeding", "[name='quantity']")) || 0;
        var note = formValue("note");
        if (!targetLink) throw new Error(t("target_required"));
        if (!quantity) throw new Error(t("quantity_required"));
        var result = await api("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: product.id,
            quantity: quantity,
            target_link: targetLink,
            note: note
          }),
        });
        showMessage(t("order_created") + result.orderCode, true);
        setTimeout(function () {
          window.location.href = "/user/orders?created=" + encodeURIComponent(result.orderCode);
        }, 1000);
      } catch (error) {
        var message = error && error.message ? error.message : t("order_failed");
        if (/authentication required|กรุณาเข้าสู่ระบบ/i.test(message)) {
          window.location.href = "/user/login";
          return;
        }
        showMessage(message, false);
      }
    });
    return true;
  }

  setupLogin();
  setupRegister();
  setupOrder();
})();
