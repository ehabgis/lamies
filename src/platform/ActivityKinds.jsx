import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, ArrowDown, Wind, Lightning } from "phosphor-react";
import ResourcePin from "../components/Map/ResourcePin";

const label = (o) => (typeof o === "object" ? o.label || o.name || o.id : o);
const value = (o) => String(typeof o === "object" ? o.id : o);
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- classify
// Cards go into one of the groups by dragging (mouse or finger) or by tapping
// the card, then the group. Placed cards can be picked up and moved again.
export function ClassifyActivity({ q, answer, onChange, locked, resources = [] }) {
  const [selected, setSelected] = useState(null);
  const [ghost, setGhost] = useState(null);
  const drag = useRef(null);
  const items = (q.options || []).map((o) => ({ id: value(o), label: label(o) }));
  const resource = (id) => resources.find((r) => r.id === q.optionResources?.[id]);
  const place = (id, group) => {
    const next = { ...answer };
    if (group) next[id] = group;
    else delete next[id];
    onChange(next);
    setSelected(null);
  };
  const pick = (id) => {
    if (locked) return;
    if (drag.current?.moved) return;
    setSelected(selected === id ? null : id);
  };
  const dropOn = (group) => {
    if (!locked && selected) place(selected, group);
  };

  // One pointer path for mouse, pen and touch (HTML drag events skip touch).
  const down = (e, id) => {
    if (locked || e.button > 0) return;
    drag.current = { id, x: e.clientX, y: e.clientY, moved: false };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
    if (!d.moved) e.currentTarget.setPointerCapture?.(e.pointerId);
    d.moved = true;
    setGhost({ id: d.id, x: e.clientX, y: e.clientY });
  };
  const up = (e) => {
    const d = drag.current;
    if (!d) return;
    if (d.moved) {
      const zone = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-zone]");
      if (zone) place(d.id, zone.dataset.zone || null);
      setGhost(null);
      // The click that follows a drag must not select the card.
      setTimeout(() => (drag.current = null));
    } else drag.current = null;
  };
  const cancel = () => {
    drag.current = null;
    setGhost(null);
  };
  const handlers = (id) => ({
    onPointerDown: (e) => down(e, id),
    onPointerMove: move,
    onPointerUp: up,
    onPointerCancel: cancel,
    onClick: () => pick(id),
  });
  // A plain render function, not a component: the button must stay the same
  // element while it is dragged, or the pointer capture is lost.
  const card = (item, small) => {
    const r = resource(item.id);
    return (
      <button
        key={item.id}
        type="button"
        className={`ra-card ${small ? "is-small" : ""} ${selected === item.id ? "is-selected" : ""} ${ghost?.id === item.id ? "is-lifted" : ""}`}
        aria-pressed={selected === item.id}
        disabled={locked}
        {...handlers(item.id)}
      >
        {r && (
          <span className="ra-card-icon" aria-hidden="true">
            <ResourcePin resource={r} />
          </span>
        )}
        <span>{item.label}</span>
      </button>
    );
  };
  const ghostItem = ghost && items.find((i) => i.id === ghost.id);

  return (
    <>
      {/* Placed cards leave this grid, so the groups below get the room. */}
      <div className="ra-classify-cards" data-zone="" aria-label="البطاقات">
        {items.filter((item) => !answer[item.id]).map((item) => card(item))}
      </div>
      <div className="ra-zones">
        {(q.groups || []).map((g) => {
          const inside = items.filter((i) => answer[i.id] === g);
          return (
            <div
              key={g}
              data-zone={g}
              className={`ra-zone ${selected ? "is-ready" : ""}`}
              onClick={(e) => {
                if (!e.target.closest(".ra-card")) dropOn(g);
              }}
            >
              <button
                type="button"
                className="ra-zone-head"
                disabled={locked || !selected}
                aria-label={selected ? `ضع «${items.find((i) => i.id === selected)?.label}» في ${g}` : g}
              >
                {g}
              </button>
              {inside.length ? (
                <div className="ra-zone-cards">{inside.map((item) => card(item, true))}</div>
              ) : (
                <span className="ra-zone-empty">ضع البطاقات هنا</span>
              )}
            </div>
          );
        })}
      </div>
      {ghostItem &&
        createPortal(
          <span className="ra-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
            {resource(ghostItem.id) && <ResourcePin resource={resource(ghostItem.id)} />}
            {ghostItem.label}
          </span>,
          document.body,
        )}
    </>
  );
}

// ---------------------------------------------------------------- match
// Choices are usually written in the same order as their items. Show them in
// an order where none sits straight across from the item it was written for.
const mixed = (list) => {
  const n = list.length;
  const order = n === 4 ? [1, 3, 0, 2] : list.map((_, i) => (i + 1) % n);
  return n > 1 ? order.map((i) => list[i]) : list;
};
// Left column (in RTL, the right one) and right column; a line joins each pair.
// Tap one side, then the other. Tapping a joined card lets the child change it.
export function MatchActivity({ q, answer, onChange, locked, result, resources = [] }) {
  const [selected, setSelected] = useState(null);
  const [lines, setLines] = useState([]);
  const box = useRef(null);
  const left = useRef({});
  const right = useRef({});
  const pairs = q.pairs || [];
  const uses = mixed([...new Set(pairs.flatMap((p) => (p.choices || q.options || []).map(label)))]);
  const resource = (id) => resources.find((r) => r.id === id);

  const link = (pairId, use) => {
    const next = Object.fromEntries(Object.entries(answer).filter(([, u]) => u !== use));
    next[pairId] = use;
    onChange(next);
    setSelected(null);
  };
  const tapLeft = (id) => {
    if (selected?.side === "right") return link(id, selected.id);
    setSelected(selected?.id === id ? null : { side: "left", id });
  };
  const tapRight = (use) => {
    if (selected?.side === "left") return link(selected.id, use);
    setSelected(selected?.id === use ? null : { side: "right", id: use });
  };

  // Lines are measured from the cards, so they follow any screen size.
  useLayoutEffect(() => {
    const draw = () => {
      const b = box.current?.getBoundingClientRect();
      if (!b) return;
      setLines(
        Object.entries(answer)
          .map(([id, use]) => {
            const a = left.current[id]?.getBoundingClientRect();
            const c = right.current[use]?.getBoundingClientRect();
            if (!a || !c) return null;
            const rtl = a.left > c.left;
            return {
              id,
              x1: (rtl ? a.left : a.right) - b.left,
              y1: a.top + a.height / 2 - b.top,
              x2: (rtl ? c.right : c.left) - b.left,
              y2: c.top + c.height / 2 - b.top,
            };
          })
          .filter(Boolean),
      );
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [JSON.stringify(answer)]);

  const usedBy = (use) => Object.keys(answer).find((k) => answer[k] === use);
  return (
    <div className={`ra-match ${result ? `is-${result}` : ""}`} ref={box}>
      <svg className="ra-lines" aria-hidden="true">
        {lines.map((l) => (
          <g key={l.id} className={selected?.id === l.id || selected?.id === answer[l.id] ? "is-active" : ""}>
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
            <circle cx={l.x1} cy={l.y1} r="5" />
            <circle cx={l.x2} cy={l.y2} r="5" />
          </g>
        ))}
      </svg>
      <div className="ra-col" role="group" aria-label={q.columns?.[0] || "العناصر"}>
        {q.columns && <h4>{q.columns[0]}</h4>}
        {pairs.map((p) => (
          <button
            type="button"
            key={p.id}
            ref={(el) => (left.current[p.id] = el)}
            className={`ra-card ra-row ${selected?.id === p.id ? "is-selected" : ""} ${answer[p.id] ? "is-linked" : ""}`}
            aria-pressed={selected?.id === p.id}
            aria-label={answer[p.id] ? `${p.label}: موصول بـ ${answer[p.id]}` : p.label}
            disabled={locked}
            onClick={() => tapLeft(p.id)}
          >
            {(p.image || resource(p.id)) && (
              <span className="ra-card-icon" aria-hidden="true">
                {p.image ? <img src={p.image} alt="" /> : <ResourcePin resource={resource(p.id)} />}
              </span>
            )}
            <span>{p.label}</span>
          </button>
        ))}
      </div>
      <div className="ra-col" role="group" aria-label={q.columns?.[1] || "الاختيارات"}>
        {q.columns && <h4>{q.columns[1]}</h4>}
        {uses.map((u) => (
          <button
            type="button"
            key={u}
            ref={(el) => (right.current[u] = el)}
            className={`ra-card ra-row ${selected?.id === u ? "is-selected" : ""} ${usedBy(u) ? "is-linked" : ""}`}
            aria-pressed={selected?.id === u}
            disabled={locked}
            onClick={() => tapRight(u)}
          >
            <span>{u}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- order
const STEP_ICONS = { wind: Wind, lightning: Lightning, turbine: Turbine };

// Cards with ↑/↓ beside each; the card glides to its new place.
export function OrderActivity({ q, answer, onMove, locked, result }) {
  const refs = useRef({});
  const before = useRef({});
  useLayoutEffect(() => {
    const now = {};
    for (const [k, el] of Object.entries(refs.current)) if (el) now[k] = el.getBoundingClientRect().top;
    if (!reduced())
      for (const [k, top] of Object.entries(now)) {
        const was = before.current[k];
        const el = refs.current[k];
        if (was == null || was === top || !el) continue;
        el.style.transition = "none";
        el.style.transform = `translateY(${was - top}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "transform 260ms ease";
          el.style.transform = "";
        });
      }
    before.current = now;
  });
  const press = (e, i, delta) => {
    const li = e.currentTarget.closest("li");
    onMove(i, delta);
    // Keep the keyboard on the same card; switch arrows if this one is now off.
    requestAnimationFrame(() => {
      const edge = (delta < 0 && i + delta === 0) || (delta > 0 && i + delta === answer.length - 1);
      li?.querySelector(edge ? (delta < 0 ? ".ra-down" : ".ra-up") : delta < 0 ? ".ra-up" : ".ra-down")?.focus();
    });
  };
  return (
    <>
      <p className="ra-direction">
        <ArrowDown size={16} weight="bold" aria-hidden="true" /> الترتيب يبدأ من أعلى إلى أسفل
      </p>
      <ol className={`ra-order ${result ? `is-${result}` : ""}`}>
        {answer.map((o, i) => {
          const key = value(o);
          const Icon = STEP_ICONS[q.optionIcons?.[key]];
          return (
            <li key={key} ref={(el) => (refs.current[key] = el)} className="ra-card ra-step">
              <span className="ra-step-number" aria-hidden="true">
                {i + 1}
              </span>
              {Icon && (
                <span className="ra-step-icon" aria-hidden="true">
                  <Icon weight="duotone" />
                </span>
              )}
              <span className="ra-step-text">{label(o)}</span>
              <span className="ra-step-arrows">
                <button
                  type="button"
                  className="ra-up"
                  aria-label={`نقل «${label(o)}» لأعلى، مكانها الآن ${i + 1}`}
                  disabled={locked || !i}
                  onClick={(e) => press(e, i, -1)}
                >
                  <ArrowUp weight="bold" />
                </button>
                <button
                  type="button"
                  className="ra-down"
                  aria-label={`نقل «${label(o)}» لأسفل، مكانها الآن ${i + 1}`}
                  disabled={locked || i === answer.length - 1}
                  onClick={(e) => press(e, i, 1)}
                >
                  <ArrowDown weight="bold" />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function Turbine({ weight, ...props }) {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M15 12h2l1 18h-4z" />
      <circle cx="16" cy="11" r="2.4" />
      <path d="M16 9 14.6 2.5Q16 1 17.4 2.5z" />
      <path d="m17.8 12.2 6.2 2.3q.4 2-1.6 2.4z" />
      <path d="m14.2 12.2-6.2 2.3q-.4 2 1.6 2.4z" />
    </svg>
  );
}
