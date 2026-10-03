/**
 * Client half of dsh-market-sidebar.
 *
 * Adds one entry to the sidebar footer (`sidebar.footer.action`) labelled
 * 插件市场. The slot is a list sorted by (priority, order) ascending, and the
 * Agents-Anywhere bridge registers 远程控制 at order 26, and the slot renders
 * as a horizontal row — so an order above 26 puts this entry to the RIGHT of
 * 远程控制. The launcher also claims `margin-left: auto`, which settles it
 * against the right edge of that row instead of hugging its neighbour.
 *
 * Clicking the entry opens a full-panel overlay that hosts the market's own
 * panel. The panel is not rebuilt here: the dsh-market plugin publishes a
 * `market` service, and `market.render()` hands back the whole market panel as
 * a React element meant to be mounted inside a host container. Because every
 * bundle resolves React through the host module table, that element is created
 * with the same React instance this bundle uses.
 *
 * Registration is wrapped in `ctx.inject(['market'], ...)` on purpose: with the
 * market absent (uninstalled, disabled, or the desktop provider switched to the
 * official community market) nothing is registered at all, instead of leaving a
 * dead button behind.
 */
window.__ModuleLoader__.load({
	id: "dsh-market-sidebar",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const react = require("react");
		const clientStore = require("@deepseek-ai/dsh-client-store");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region locales
		const NS = "market-sidebar";

		/** Simplified Chinese dictionary (key-set source of truth). */
		const zh = {
			entry: "插件市场",
			title: "插件市场",
			close: "关闭插件市场",
			unavailable: "插件市场面板暂时不可用。"
		};
		/** English dictionary, keyed identically to `zh`. */
		const en = {
			entry: "Plugin Market",
			title: "Plugin Market",
			close: "Close the plugin market",
			unavailable: "The plugin market panel is unavailable right now."
		};
		//#endregion

		//#region styles
		const STYLE_TEXT = [
			".dshMarketSidebarOverlay{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:24px}",
			".dshMarketSidebarMask{position:absolute;inset:0;margin:0;padding:0;border:0;background:var(--dsw-alias-bg-mask,rgba(0,0,0,.45));cursor:default}",
			".dshMarketSidebarPanel{position:relative;display:flex;flex-direction:column;width:min(1180px,96vw);height:min(880px,92vh);background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.3);overflow:hidden}",
			".dshMarketSidebarHeader{display:flex;align-items:center;justify-content:space-between;gap:16px;flex:0 0 auto;padding:14px 18px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12))}",
			".dshMarketSidebarTitle{margin:0;font:var(--dsw-font-s-14);font-weight:600;color:var(--dsw-alias-label-primary,inherit)}",
			".dshMarketSidebarBody{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:auto}",
			".dshMarketSidebarBody>*{min-height:0}",
			// The footer slot's anchor ships `display: contents`, and each entry
			// stretches to the full width of the row, so the entries stack one per
			// line with the row's surface smeared across the whole width. Declaring
			// the anchor as a real horizontal row and letting every entry shrink to
			// its content width puts them side by side; the auto margin then keeps
			// this plugin's entry at the right edge of that row.
			'[data-slot="sidebar.footer.action"]{display:flex !important;flex-direction:row !important;align-items:center;gap:2px;width:100%;min-width:0}',
			'[data-slot="sidebar.footer.action"]>*{flex:0 0 auto !important;width:auto !important;min-width:0}',
			'[data-slot="sidebar.footer.action"]>:has([data-icon=market-sidebar]){margin-left:auto !important}'
		].join("");

		let stylesInstalled = false;
		/** Install the overlay stylesheet once, into `<head>`. */
		function installStyles() {
			if (stylesInstalled) return;
			if (typeof document === "undefined") return;
			stylesInstalled = true;
			const style = document.createElement("style");
			style.dataset.dshMarketSidebar = "";
			style.textContent = STYLE_TEXT;
			document.head.append(style);
		}
		//#endregion

		//#region view store
		/** Whether the market overlay is open. Shared by the launcher and the overlay. */
		function createViewStore() {
			return clientStore.defineStore({
				init: () => ({ open: false }),
				actions: {
					open: (draft) => {
						draft.open = true;
					},
					close: (draft) => {
						draft.open = false;
					}
				}
			});
		}
		//#endregion

		//#region launcher
		/** Storefront glyph for the sidebar entry. */
		function MarketIcon({ size }) {
			return react.createElement(
				"svg",
				{
					width: size,
					height: size,
					viewBox: "0 0 16 16",
					fill: "none",
					"data-icon": "market-sidebar",
					"aria-hidden": "true",
					xmlns: "http://www.w3.org/2000/svg"
				},
				react.createElement("path", {
					d: "M1.75 5.5h12.5l-1 8.1a1 1 0 0 1-1 .9H3.75a1 1 0 0 1-1-.9l-1-8.1Z",
					stroke: "currentColor",
					strokeWidth: 1.25,
					strokeLinejoin: "round"
				}),
				react.createElement("path", {
					d: "M5.6 5.5V4.35a2.4 2.4 0 0 1 4.8 0V5.5",
					stroke: "currentColor",
					strokeWidth: 1.25,
					strokeLinecap: "round"
				})
			);
		}

		/**
		 * The sidebar footer entry. Collapsed renders the glyph alone; expanded
		 * renders glyph plus label, matching the neighbouring entries.
		 */
		function MarketLauncher({ wide, useStore, actions, t }) {
			const open = useStore((state) => state.open);
			return react.createElement(
				primitives.Tooltip,
				{ label: t("entry"), delayMs: 500, disabled: wide },
				react.createElement(
					primitives.Button,
					{
						variant: "ghost",
						"data-wide": wide,
						"aria-label": t("entry"),
						"aria-haspopup": "dialog",
						"aria-expanded": open,
						icon: react.createElement(MarketIcon, { size: wide ? 16 : 18 }),
						onClick: () => actions.open()
					},
					wide ? t("entry") : null
				)
			);
		}
		//#endregion

		//#region overlay
		/** Full-panel overlay hosting the market's own panel element. */
		function MarketOverlay({ useStore, actions, market, t }) {
			const open = useStore((state) => state.open);

			react.useEffect(() => {
				if (!open) return;
				const onKeyDown = (event) => {
					if (event.key !== "Escape") return;
					// Do not steal Escape from a dialog stacked above this one.
					if (document.querySelectorAll('[role="dialog"]').length > 1) return;
					actions.close();
				};
				document.addEventListener("keydown", onKeyDown);
				return () => document.removeEventListener("keydown", onKeyDown);
			}, [actions, open]);

			if (!open) return null;

			const panel =
				market && typeof market.render === "function"
					? market.render({})
					: react.createElement("p", null, t("unavailable"));

			return react.createElement(
				"div",
				{
					className: "dshMarketSidebarOverlay",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("title")
				},
				react.createElement("button", {
					className: "dshMarketSidebarMask",
					type: "button",
					"aria-label": t("close"),
					onClick: () => actions.close()
				}),
				react.createElement(
					"section",
					{ className: "dshMarketSidebarPanel" },
					react.createElement(
						"header",
						{ className: "dshMarketSidebarHeader" },
						react.createElement("h1", { className: "dshMarketSidebarTitle" }, t("title")),
						react.createElement(primitives.Button, {
							variant: "ghost",
							size: "sm",
							"aria-label": t("close"),
							icon: react.createElement(primitives.IconCloseOutlineRegular, null),
							onClick: () => actions.close()
						})
					),
					react.createElement("div", { className: "dshMarketSidebarBody" }, panel)
				)
			);
		}
		//#endregion

		//#region plugin
		const inject = ["slots", "locale"];

		/** Sidebar entry order: 27 sorts after 远程控制 (order 26) in the footer row. */
		const ORDER = 27;

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "market-sidebar: dictionaries");
			ctx.effect(() => installStyles(), "market-sidebar: styles");

			// Only contribute UI while the market service actually exists.
			ctx.inject(["market"], (marketCtx) => {
				const market = marketCtx.get("market");
				const view = createViewStore();
				const t = marketCtx.locale.bind(NS);

				marketCtx.effect(
					() =>
						marketCtx.slots.inject(
							"sidebar.footer.action",
							() =>
								marketCtx.slots.register(
									{
										name: "sidebar.footer.action",
										id: "dsh-market-sidebar",
										order: ORDER,
										locale: NS,
										label: () => t("entry"),
										store: view
									},
									MarketLauncher
								)
						),
					"market-sidebar: launcher"
				);

				marketCtx.effect(
					() =>
						marketCtx.slots.inject(
							"shell.overlay",
							() =>
								marketCtx.slots.register(
									{
										name: "shell.overlay",
										id: "dsh-market-sidebar",
										order: ORDER,
										locale: NS,
										store: view,
										inject: () => ({ market })
									},
									MarketOverlay
								)
						),
					"market-sidebar: overlay"
				);
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
