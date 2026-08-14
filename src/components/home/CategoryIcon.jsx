import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';

/**
 * Renders a category's thumbnail photo (admin-uploaded, from the
 * `categories` collection's `image` field — see CategoryFormModal) when
 * one is set, falling back to the emoji glyph from CATEGORY_ICONS
 * otherwise. Shared by every storefront spot that shows a category icon
 * (Shop by Category headers, quick-nav launcher, quick-jump strip,
 * category listing header + banner) so the fallback behaviour and photo
 * fit stay consistent everywhere.
 */
export default function CategoryIcon({ image, icon, name, className = '', imgClassName = '', lazy = true }) {
  if (!image) {
    return <span className={className}>{icon}</span>;
  }

  const Img = lazy ? LazyLoadImage : 'img';
  const imgProps = lazy ? { effect: 'opacity' } : {};

  return (
    <span className={className}>
      <Img
        src={image}
        alt={name || ''}
        className={`h-full w-full object-cover ${imgClassName}`}
        {...imgProps}
      />
    </span>
  );
}
