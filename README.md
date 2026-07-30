# ABS Crackers World — Splash, Home, Category Listing, Cart & Checkout

A premium, mobile-first React build of the ABS Crackers World splash,
home, category listing / product grid, shopping cart, and customer
checkout / order submission screens, recreated with a luxury dark
fireworks aesthetic (orange bloom, golden ambient lighting, ember
particles, cinematic gradients).

Checkout follows a **manual payment workflow** — customers never pay
inside the app. An order is submitted to Firestore with status
`AWAITING_ADMIN_CONFIRMATION`, and the ABS Crackers World team follows
up over WhatsApp or phone to confirm the order and collect payment.

## Stack
- React 19 + Vite
- React Router DOM (Home → Category Listing → Cart → Checkout)
- Tailwind CSS v4 (CSS-first theme in `src/index.css`)
- Framer Motion (splash sequence, section reveals, card/filter/form animations)
- Lottie (`lottie-react`) for the order-success burst animation
- React Hook Form + Zod for checkout form state & validation
- Fuse.js (fuzzy in-category search)
- Zustand (+ persist) for cart/wishlist state
- Swiper for the hero banner slider
- Sonner for toast notifications
- lucide-react for icons
- react-lazy-load-image-component for product images
- Firebase (Firestore + Storage) — live product catalog, images, and orders (see below)

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (defaults to http://localhost:5173).

## Project structure

```
src/
  assets/        static assets
  components/
    splash/      SplashScreen
    home/        TopBar, SearchBar, HeroSlider, TrustStrip,
                 QuickCategoryStrip, DealSection, CategoryGrid,
                 ProductCard, FooterStrip, FloatingButtons, BottomNav
    category/    CategoryHeader, CategoryBanner, FilterBar,
                 CategorySearchBar, ProductGrid, ProductCard,
                 DiscountBadge, WishlistButton, PriceSection,
                 AddToCartButton, SkeletonCard, EmptyState
    cart/        CartHeader, CartItem, QuantityStepper, OrderSummary,
                 PackingChargesCard, FreeDeliveryProgress, CouponCard,
                 RecommendedProducts, EmptyCart, CartBadge
    checkout/    CheckoutHeader, FormField, CustomerForm, AddressForm,
                 OrderReview, OrderNotes, TermsCheckbox, PlaceOrderButton,
                 OrderSuccessScreen
                 (reuses cart/FreeDeliveryProgress and cart/OrderSummary)
    ui/          AmbientBackground, EmberParticles, FireworkBurst
  pages/         Home.jsx, CategoryListing.jsx, Cart.jsx, Checkout.jsx
  store/         useCartStore.js (Zustand — cart, wishlist, coupon,
                 quantity controls, derived pricing summary)
  hooks/         useDebouncedValue.js (search debounce),
                 useCartPricing.js (reactive pricing summary)
  schemas/       checkoutSchema.js (Zod schema + default values for the
                 checkout form — customer info, address, terms)
  constants/     catalog.js (presentational constants only — category
                 icons/taglines, hero slides, trust/footer strip copy —
                 plus the slugify() helper; no product data lives here
                 anymore)
  firebase/      config.js (fill in .env — see .env.example; exports
                 `firebaseApp`, a ready-to-use `db` Firestore instance, and
                 a `storage` Firebase Storage instance)
  services/      products.js (live catalog: reads products/{productId} from
                 Firestore, resolves each product's image via Firebase
                 Storage or passes through a plain URL, and groups the flat
                 list into categories — see "Wiring up the backend" below),
                 cartFirestore.js (users/{userId}/cart sync helpers,
                 ready to wire in once Firebase Auth is enabled),
                 ordersFirestore.js (builds & writes orders/{orderId}
                 documents for the manual-payment checkout flow)
  contexts/      ProductsContext.jsx (subscribes once to the live Firestore
                 catalog and shares { products, categories, loading, error }
                 app-wide via useProducts(); also syncs the catalog into
                 useCartStore so cart pricing/stock always reads live data)
  assets/lottie/ orderSuccessBurst.json (self-contained confetti-burst
                 animation for the Order Success screen)
  utils/         cn.js (Tailwind class merge helper)
```

## Screen flow

Home → tap a category card (or a "Quick Jump" chip) → **Category
Listing** screen (`/category/:slug`) → scrollable two-column Product
Grid → tap a product *(Product Details is intentionally not built yet)*.

## Category Listing screen

- **Sticky glass header** — back button, category name + live product
  count, a wishlist-only toggle, and an animated search toggle.
- **Expandable search bar** — Fuse.js fuzzy search over the category's
  products, debounced 250ms.
- **Category banner** — luxury gradient art card with category icon,
  tagline, and item count, plus subtle firework decoration.
- **Sticky filter bar** — Sort (Popular / Newest / Price / Discount),
  Price range, In Stock toggle, and Best Offers toggle; the active
  filter glows.
- **Product grid** — two-column, equal-height cards with discount
  badge, wishlist heart, stock status, MRP/offer price, and an Add to
  Cart button with ripple + loading + added states. Cards fade up as
  they enter the viewport and lift on hover.
- **Skeleton loaders** on category change, and a premium **empty
  state** with a "Reset Filters" action when nothing matches.

## Shopping Cart screen (`/cart`)

- **Sticky glass header** — back button, cart icon, live item count and
  an animated count badge, matching the Category header language.
- **Free Delivery progress** — animated bar that fills as the cart
  grows; shows "Add ₹X more to unlock FREE Delivery" and switches to a
  green "🎉 Congratulations!" celebration (with a firework burst) the
  moment the ₹999 threshold is crossed.
- **Cart item cards** — image, name, category, MRP/offer price, discount
  badge, stock status, a large plus/minus quantity stepper (capped by
  simulated stock, floor of 1) and a remove button; items animate out
  when removed.
- **Coupon card** — collapsed by default, expands to an input + Apply
  button with quick-apply chips for `DIWALI10`, `FIRST50`, `BIGSAVE20`;
  shows a success state with the applied coupon or an invalid/ineligible
  message.
- **Order summary** — Subtotal, Discount, **Packing Charges (always-on,
  3% of the MRP subtotal)**, Delivery (FREE once unlocked), any coupon
  discount, and an animated Grand Total, plus a total-savings banner.
- **Recommended For You** / **Frequently Bought Together** — horizontal
  sliders reusing the same premium `ProductCard` from Category Listing.
- **Empty state** — firework-themed illustration, "Your cart is waiting
  for some fireworks" messaging, floating embers, and a Continue
  Shopping CTA.

All pricing (subtotal, discount, 3% packing charge, delivery threshold,
coupon math, grand total, savings) is derived in one place —
`useCartStore.getPricing()` — via the `useCartPricing()` hook, so every
component always renders consistent numbers.

## Checkout & order submission

`Cart.jsx` now has a **Proceed to Checkout** CTA (`/checkout`) below the
order summary. The Checkout screen is a single scrolling flow — no
payment step, since ABS Crackers World follows a manual-payment
workflow:

1. **Customer Information** — full name, mobile, optional alternate
   mobile & email.
2. **Delivery Address** — door/house no., street, area, city, district,
   state, PIN code, optional landmark & delivery notes.
3. **Review Order** — every cart line item with image, qty, unit price,
   line total.
4. **Free Delivery Progress** — reuses `cart/FreeDeliveryProgress`.
5. **Order Notes** — optional multiline notes.
6. **Order Summary** — reuses `cart/OrderSummary` (subtotal, discount,
   3% packing charge, delivery, coupon, grand total, savings banner).
7. **Terms & Conditions** — a custom animated checkbox; the Place Order
   button stays disabled until it's checked.
8. **Place Order** — a large gradient button with a tap-ripple and a
   loading spinner; disabled while submitting or before Terms are
   accepted, so a duplicate tap can't double-submit.

All fields are validated with **React Hook Form + Zod**
(`src/schemas/checkoutSchema.js`) — required-field checks, Indian
mobile/PIN-code format validation, and animated inline error messages.

On submit, `services/ordersFirestore.js` writes a document to
`orders/{orderId}` shaped as:

```
orderId, customer{name,mobile,alternateMobile,email},
address{houseNumber,street,area,city,district,state,pincode,
        landmark,deliveryNotes},
orderNotes, cartItems[{productId,name,image,category,unitPrice,
                        mrp,quantity,lineTotal}],
subtotal, discount, packingCharges, deliveryCharges, grandTotal,
totalSavings, orderStage: 'ORDER_SUBMITTED',
status: 'AWAITING_ADMIN_CONFIRMATION', paymentStatus: 'PENDING',
createdAt, updatedAt
```

The cart is cleared and the **Order Success screen** takes over —
Lottie confetti burst, the generated Order ID (tap to copy), a
`🟡 Awaiting Admin Confirmation` status pill, the WhatsApp/phone
follow-up message, and **Continue Shopping** / **View My Orders**
(placeholder toast) buttons.

> Remember to set Firestore security rules that allow writes to
> `orders/{orderId}` for your deployment (e.g. via anonymous auth or a
> Cloud Function) — this module writes directly from the client and
> intentionally ships without an Admin Panel or Orders History screen.

## Wiring up the backend

The product catalog is **live** — it's no longer hardcoded. `src/services/products.js`
subscribes to the `products` collection in Firestore in real time, and
`src/contexts/ProductsContext.jsx` shares the resulting `{ products, categories,
loading, error }` with every screen via `useProducts()`. Product images come
from Firebase Storage (or a plain hosted URL — see below).

1. Copy `.env.example` to `.env` and fill in your Firebase project
   credentials (Firestore + Storage both live under the same project, so
   there's only one set of `VITE_FIREBASE_*` vars to fill in).
2. Set Firestore security rules that allow reads on `products/{productId}`
   (public reads are fine for a storefront catalog) and writes to
   `orders/{orderId}` (e.g. via anonymous auth or a Cloud Function) — this
   build ships without an Admin Panel, so orders and product edits are
   expected to happen from the Firebase Console or your own tooling.
3. Populate Firestore once with `npm run seed:products` — this runs
   `scripts/seedProducts.mjs`, which migrates the original 123-product
   starter catalog (16 categories) straight into the `products` collection
   using the Firestore client SDK and your `.env` credentials.
4. Each product document has the shape: `name, category, subcategory, unit,
   mrp, salePrice, discountPercentage, image, stock, stockQty, featured,
   bestSeller, newArrival, flashDeal, description, displayOrder`.
   - `image` can be a Storage path relative to your bucket (e.g.
     `products/sparkler-10cm.jpg`, uploaded via the Firebase Console or
     Admin SDK) — resolved to a download URL on the fly and cached — or a
     plain `https://` URL, used as-is with no extra Storage round trip.
   - `stock` can be set directly (`'in' | 'low' | 'out'`) or left out and
     derived from `stockQty` (0 → out, 1–5 → low, else → in).
   - `discountPercentage` can be set directly or left out and derived from
     `mrp`/`salePrice`.
5. To add a real product photo: upload it to your Storage bucket under
   `products/`, then set that product's `image` field in Firestore to the
   matching path. No app code changes needed — `getProductImageUrl()` in
   `src/services/products.js` resolves it automatically.
6. `ProductGrid` / `CategoryGrid` / `Cart` are all written to map cleanly
   over any array, so nothing else needs to change as the catalog grows —
   just add/edit documents in the `products` collection.

## Notes

- Splash, Home, Category Listing / Product Grid, Shopping Cart, and
  Checkout / Order Submission are implemented, per spec — Product
  Details, Payment Gateway, Orders History, Profile, and Admin Panel
  are intentionally not built. The bottom nav's "Cart" tab and the
  floating "View Cart" button open `/cart`; Orders/Account tabs and
  product taps still show a toast placeholder.
- All animations are tuned for 60fps: ember particles are pure CSS,
  firework bursts are lightweight SVG + Framer Motion, and product
  cards use `whileInView` so off-screen cards don't animate until
  scrolled into view.
