/* @ds-bundle: {"format":4,"namespace":"Phila","components":[{"name":"Button"},{"name":"TextField"},{"name":"Card"},{"name":"TallyBadge"},{"name":"LowerThird"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  var uid = 0;

  function cx() {
    return Array.prototype.filter.call(arguments, Boolean).join(" ");
  }

  function omit(obj, keys) {
    var out = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) < 0) out[k] = obj[k];
    return out;
  }

  function Button(props) {
    var variant = props.variant || "primary";
    var size = props.size || "md";
    var rest = omit(props, ["variant", "size", "className", "children", "type"]);
    return h(
      "button",
      Object.assign({ type: props.type || "button" }, rest, {
        className: cx("ph-btn", "ph-btn--" + variant, "ph-btn--" + size, props.className)
      }),
      props.children
    );
  }

  function TextField(props) {
    var ref = React.useRef(null);
    if (ref.current === null) ref.current = props.id || "ph-field-" + ++uid;
    var id = ref.current;
    var hintId = id + "-hint";
    var msg = props.error || props.hint;
    var rest = omit(props, ["label", "hint", "error", "className", "id"]);
    return h(
      "div",
      { className: cx("ph-field", props.error && "ph-field--error", props.className) },
      h("label", { className: "ph-field__label", htmlFor: id }, props.label),
      h(
        "input",
        Object.assign({}, rest, {
          id: id,
          className: "ph-field__input",
          "aria-invalid": props.error ? "true" : undefined,
          "aria-describedby": msg ? hintId : undefined
        })
      ),
      msg ? h("p", { id: hintId, className: "ph-field__hint" }, msg) : null
    );
  }

  function Card(props) {
    return h(
      "section",
      { className: cx("ph-card", props.className) },
      props.eyebrow ? h("p", { className: "ph-card__eyebrow" }, props.eyebrow) : null,
      props.title ? h("h3", { className: "ph-card__title" }, props.title) : null,
      h("div", { className: "ph-card__body" }, props.children),
      props.footer ? h("div", { className: "ph-card__footer" }, props.footer) : null
    );
  }

  var TALLY_LABEL = { live: "LIVE", preview: "PVW", ready: "READY", off: "OFF" };

  function TallyBadge(props) {
    var state = props.state || "off";
    return h(
      "span",
      { className: cx("ph-tally", "ph-tally--" + state, props.className) },
      h("span", { className: "ph-tally__dot", "aria-hidden": "true" }),
      props.label || TALLY_LABEL[state]
    );
  }

  function LowerThird(props) {
    return h(
      "div",
      { className: cx("ph-l3", props.className) },
      h(
        "div",
        { className: "ph-l3__mark", "aria-hidden": "true" },
        h(
          "svg",
          { viewBox: "0 0 100 100", width: "100%", height: "100%" },
          h("path", {
            d: "M15 35V25A10 10 0 0 1 25 15H35M65 15H75A10 10 0 0 1 85 25V35M85 65V75A10 10 0 0 1 75 85H65M35 85H25A10 10 0 0 1 15 75V65",
            fill: "none",
            stroke: "#ffffff",
            strokeWidth: 10,
            strokeLinecap: "round",
            strokeLinejoin: "round"
          }),
          h("path", { d: "M40 31L69 50L40 69Z", fill: "#e8b774", stroke: "#e8b774", strokeWidth: 8, strokeLinejoin: "round" })
        )
      ),
      h(
        "div",
        { className: "ph-l3__text" },
        h("p", { className: "ph-l3__name" }, props.name),
        props.title ? h("p", { className: "ph-l3__title" }, props.title) : null
      ),
      props.live ? h("span", { className: "ph-l3__live" }, "LIVE") : null
    );
  }

  window.Phila = Object.assign(window.Phila || {}, {
    Button: Button,
    TextField: TextField,
    Card: Card,
    TallyBadge: TallyBadge,
    LowerThird: LowerThird
  });
})();
