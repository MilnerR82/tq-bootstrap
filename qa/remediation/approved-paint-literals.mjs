// Reviewed static acceptance contract for the explicitly approved paint and
// forced-colours adaptation layers. These literals are never derived from the
// product during a test run; unknown source, selectors, properties or geometry
// fail exact comparison. Normal native CSS remains independently compiled.
export const accessibleSource = String.raw`// Contextual reading/control paint only. Bootstrap's native dimensions,
// typography, borders, shadows, transforms, utilities and APIs remain intact.

// Outlined search actions need readable ink on both light and brand-filled
// native navbars; their native role-specific hover/active fills are preserved.
.navbar .btn-outline-primary,
.navbar .btn-outline-success,
.navbar .btn-outline-light {
  --#{$prefix}btn-color: var(--#{$prefix}navbar-color);
  --#{$prefix}btn-border-color: var(--#{$prefix}navbar-color);
}

// A fixed light-mode secondary colour cannot serve as reading text on the
// explicitly dark native example surfaces. Limit the adaptation to that
// concrete colour context, leaving the general text-secondary utility intact.
.bg-dark.text-secondary,
.bg-dark .text-secondary,
.text-bg-dark .text-secondary {
  color: #{$tq-koala} !important;
}

// Mode defaults retain the semantic bases on light reading surfaces. Dark
// reading surfaces use their native emphasis tints for readable outlined ink.
:root,
[data-bs-theme="light"] {
  @each $role, $value in $theme-colors {
    --tq-mode-outline-#{$role}: #{$value};
    --tq-mode-outline-#{$role}-rgb: #{to-rgb($value)};
  }
  --tq-mode-outline-primary-neutral: #{$tq-red-dark};
  --tq-mode-outline-primary-neutral-rgb: #{to-rgb($tq-red-dark)};
  --tq-mode-close-focus-reading-rgb: var(--#{$prefix}body-color-rgb);
  --tq-mode-close-focus-on-light-rgb: #{to-rgb($tq-indigo)};
  --tq-mode-close-focus-on-dark-rgb: 255, 255, 255;
  --tq-mode-range-track-bg: #{$tq-koala};
  --tq-mode-range-thumb-bg: #{$primary};
  --tq-mode-range-thumb-active-bg: #{$tq-red-dark};
  --tq-mode-active-bg: #{$component-active-bg};
  --tq-mode-active-colour: #{$component-active-color};
  --tq-mode-carousel-indicator-inactive-bg: #{$tq-warm};
}
@if $enable-dark-mode {
  @include color-mode(dark, true) {
  $dark-inks: (primary: $primary-text-emphasis-dark, secondary: $secondary-text-emphasis-dark, success: $success-text-emphasis-dark, info: $info-text-emphasis-dark, warning: $warning-text-emphasis-dark, danger: $danger-text-emphasis-dark, light: $light-text-emphasis-dark, dark: $dark-text-emphasis-dark);
  @each $role, $value in $theme-colors {
    $ink: if(map-has-key($dark-inks, $role), map-get($dark-inks, $role), tint-color($value, 40%));
    --tq-mode-outline-#{$role}: #{$ink};
    --tq-mode-outline-#{$role}-rgb: #{to-rgb($ink)};
  }
  --tq-mode-outline-primary-neutral: #{$primary-text-emphasis-dark};
  --tq-mode-outline-primary-neutral-rgb: #{to-rgb($primary-text-emphasis-dark)};
  --tq-mode-close-focus-reading-rgb: 0, 0, 0;
  --tq-mode-close-focus-on-light-rgb: 255, 255, 255;
  --tq-mode-close-focus-on-dark-rgb: 0, 0, 0;
  --tq-mode-range-track-bg: #{$tq-indigo};
  --tq-mode-range-thumb-bg: #{$tq-red-light};
  --tq-mode-range-thumb-active-bg: #{$tq-red-bright};
  --tq-mode-active-bg: #{$tq-red-bright};
  --tq-mode-active-colour: #{$tq-indigo};
  --tq-mode-carousel-indicator-inactive-bg: #{$tq-indigo};
}
}
@each $role, $value in $theme-colors {
  .btn-outline-#{$role} {
    --#{$prefix}btn-color: var(--tq-outline-#{$role}, var(--tq-mode-outline-#{$role}, #{$value}));
    --#{$prefix}btn-border-color: var(--tq-outline-#{$role}, var(--tq-mode-outline-#{$role}, #{$value}));
  }
  .focus-ring-#{$role} {
    --#{$prefix}focus-ring-color: rgba(var(--tq-outline-#{$role}-rgb, var(--tq-mode-outline-#{$role}-rgb, #{to-rgb($value)})), var(--#{$prefix}focus-ring-opacity)) !important;
  }
}
.focus-ring {
  --#{$prefix}focus-ring-color: rgba(var(--tq-focus-ring-rgb, var(--#{$prefix}body-color-rgb)), var(--#{$prefix}focus-ring-opacity));
}

// Use inherited host tokens rather than descendant overrides: a nested reading
// panel resets its own context, regardless of its coloured ancestor's selector.
.card,
.modal-content,
.offcanvas,
.dropdown-menu,
.list-group-item,
.bg-body {
  --tq-range-track-bg: var(--tq-mode-range-track-bg, #{$tq-koala});
  --tq-range-thumb-bg: var(--tq-mode-range-thumb-bg, #{$primary});
  --tq-range-thumb-active-bg: var(--tq-mode-range-thumb-active-bg, #{$tq-red-dark});
  --tq-focus-ring-colour: var(--#{$prefix}body-color);
  --tq-focus-ring-rgb: var(--#{$prefix}body-color-rgb);
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-reading-rgb, var(--#{$prefix}body-color-rgb));
  @each $role, $value in $theme-colors {
    --tq-outline-#{$role}: var(--tq-mode-outline-#{$role}, #{$value});
    --tq-outline-#{$role}-rgb: var(--tq-mode-outline-#{$role}-rgb, #{to-rgb($value)});
  }
}
.bg-body-secondary,
.bg-body-tertiary {
  --tq-range-track-bg: var(--tq-mode-range-track-bg, #{$tq-koala});
  --tq-range-thumb-bg: var(--tq-mode-range-thumb-bg, #{$primary});
  --tq-range-thumb-active-bg: var(--tq-mode-range-thumb-active-bg, #{$tq-red-dark});
  --tq-focus-ring-colour: var(--#{$prefix}body-color);
  --tq-focus-ring-rgb: var(--#{$prefix}body-color-rgb);
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-reading-rgb, var(--#{$prefix}body-color-rgb));
  @each $role, $value in $theme-colors {
    --tq-outline-#{$role}: var(--tq-mode-outline-#{$role}, #{$value});
    --tq-outline-#{$role}-rgb: var(--tq-mode-outline-#{$role}-rgb, #{to-rgb($value)});
  }
  --tq-outline-primary: var(--tq-mode-outline-primary-neutral);
  --tq-outline-primary-rgb: var(--tq-mode-outline-primary-neutral-rgb);
}
.bg-white {
  --tq-range-track-bg: #{$tq-koala};
  --tq-range-thumb-bg: #{$primary};
  --tq-range-thumb-active-bg: #{$tq-red-dark};
  --tq-focus-ring-colour: #{$tq-indigo};
  --tq-focus-ring-rgb: #{to-rgb($tq-indigo)};
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-on-light-rgb, #{to-rgb($tq-indigo)});
  @each $role, $value in $theme-colors {
    --tq-outline-#{$role}: #{$value};
    --tq-outline-#{$role}-rgb: #{to-rgb($value)};
  }
}
@each $host, $surface in $theme-colors {
  .bg-#{$host},
  .text-bg-#{$host} {
    $ink: color-contrast($surface);
    --tq-focus-ring-colour: #{$ink};
    --tq-focus-ring-rgb: #{to-rgb($ink)};
    --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-on-#{if($ink == $color-contrast-light, "dark", "light")}-rgb, #{to-rgb($ink)});
    @each $role, $value in $theme-colors {
      --tq-outline-#{$role}: #{$ink};
      --tq-outline-#{$role}-rgb: #{to-rgb($ink)};
    }
  }
}
// Indigo safely retains the original bright-role outlines. Darker role inks
// need a light tint even when the surrounding document uses the light mode.
.bg-dark,
.text-bg-dark {
  @each $role, $value in $theme-colors {
    $ink: if(contrast-ratio($dark, $value) >= 4.5, $value, tint-color($value, 60%));
    --tq-outline-#{$role}: #{$ink};
    --tq-outline-#{$role}-rgb: #{to-rgb($ink)};
  }
}
.navbar {
  --tq-focus-ring-colour: var(--#{$prefix}navbar-color);
}

// Bootstrap hard-codes translucent button focus paint. Retain the original
// Sass width and zero blur/spread positions while using opaque context ink.
.btn {
  --#{$prefix}btn-focus-box-shadow: 0 0 0 #{$btn-focus-width} var(--tq-focus-ring-colour, var(--#{$prefix}body-color));
}
// Keep native navbar search ink after the general outline role declarations.
.navbar .btn-outline-primary,
.navbar .btn-outline-success,
.navbar .btn-outline-light {
  --#{$prefix}btn-color: var(--#{$prefix}navbar-color);
  --#{$prefix}btn-border-color: var(--#{$prefix}navbar-color);
}

// The native dark close-button filter also transforms its focus shadow. Feed
// that existing filter the inverse context ink; preserve its icon and geometry.
// A custom authored shadow is left untouched, including its original alpha.
@if $btn-close-focus-shadow == (0 0 $focus-ring-blur $focus-ring-width $focus-ring-color) {
  .btn-close {
    --#{$prefix}btn-close-focus-shadow: 0 0 #{$focus-ring-blur} #{$focus-ring-width} rgba(var(--tq-close-focus-prefilter-rgb, var(--tq-mode-close-focus-reading-rgb, var(--#{$prefix}body-color-rgb))), #{$focus-ring-opacity});
  }
  .btn-close-white {
    --#{$prefix}btn-close-focus-shadow: 0 0 #{$focus-ring-blur} #{$focus-ring-width} rgba(0, 0, 0, #{$focus-ring-opacity});
  }
}

// Read-only plaintext inputs remain keyboard stops despite their native zero
// outline. This explicit accessibility outline changes no layout dimensions.
.form-control-plaintext:focus-visible {
  outline: 2px solid var(--tq-focus-ring-colour, var(--#{$prefix}body-color));
  outline-offset: 2px;
}

// Restore the nearest explicitly light navbar's original parent-owned SVG.
// Native ancestor-dark icon declarations otherwise leak through a light navbar.
.navbar[data-bs-theme="light"] .navbar-toggler-icon {
  --#{$prefix}navbar-toggler-icon-bg: inherit;
}

// Retain native indicator opacity and dimensions. Separate the inactive paint
// so both its presence and the selected state remain visible on supported slides.
@if $carousel-indicator-active-bg == $white and $carousel-dark-indicator-active-bg == $tq-indigo {
  .carousel-indicators [data-bs-target]:not(.active) {
    background-color: var(--tq-carousel-indicator-inactive-bg, var(--tq-mode-carousel-indicator-inactive-bg, #{$tq-warm}));
  }
  .carousel-dark {
    --tq-carousel-indicator-inactive-bg: #{$tq-indigo};
  }
}

// These guards preserve explicitly authored Sass role/state overrides. Only
// the native TQ defaults receive mode-aware selected-state colour additions.
@if $primary == $tq-red and $component-active-bg == $primary and $component-active-color == $tq-white {
  @if $nav-pills-link-active-bg == $component-active-bg and $nav-pills-link-active-color == $component-active-color {
    .nav-pills {
      --#{$prefix}nav-pills-link-active-bg: var(--tq-mode-active-bg, #{$nav-pills-link-active-bg});
      --#{$prefix}nav-pills-link-active-color: var(--tq-mode-active-colour, #{$nav-pills-link-active-color});
    }
  }
  @if $pagination-active-bg == $component-active-bg and $pagination-active-color == $component-active-color {
    .pagination {
      --#{$prefix}pagination-active-bg: var(--tq-mode-active-bg, #{$pagination-active-bg});
      --#{$prefix}pagination-active-color: var(--tq-mode-active-colour, #{$pagination-active-color});
      @if $pagination-active-border-color == $component-active-bg {
        --#{$prefix}pagination-active-border-color: var(--tq-mode-active-bg, #{$pagination-active-border-color});
      }
    }
  }
  @if $list-group-active-bg == $component-active-bg and $list-group-active-color == $component-active-color {
    .list-group {
      --#{$prefix}list-group-active-bg: var(--tq-mode-active-bg, #{$list-group-active-bg});
      --#{$prefix}list-group-active-color: var(--tq-mode-active-colour, #{$list-group-active-color});
      @if $list-group-active-border-color == $component-active-bg {
        --#{$prefix}list-group-active-border-color: var(--tq-mode-active-bg, #{$list-group-active-border-color});
      }
    }
  }
  @if $dropdown-link-active-bg == $component-active-bg and $dropdown-link-active-color == $component-active-color {
    .dropdown-menu {
      --#{$prefix}dropdown-link-active-bg: var(--tq-mode-active-bg, #{$dropdown-link-active-bg});
      --#{$prefix}dropdown-link-active-color: var(--tq-mode-active-colour, #{$dropdown-link-active-color});
    }
    .dropdown-menu-dark {
      --#{$prefix}dropdown-link-active-bg: #{$dropdown-dark-link-active-bg};
      --#{$prefix}dropdown-link-active-color: #{$dropdown-dark-link-active-color};
      @if $dropdown-dark-link-active-bg == $component-active-bg and $dropdown-dark-link-active-color == $component-active-color {
        --#{$prefix}dropdown-link-active-bg: #{$tq-red-bright};
        --#{$prefix}dropdown-link-active-color: #{$tq-indigo};
      }
    }
  }
}
@if $nav-tabs-link-active-border-color == ($nav-tabs-border-color $nav-tabs-border-color $nav-tabs-link-active-bg) {
  .nav-tabs {
    --#{$prefix}nav-tabs-link-active-border-color: var(--#{$prefix}secondary-color) var(--#{$prefix}secondary-color) #{$nav-tabs-link-active-bg};
  }
}

// Preserve existing active-border widths. On dark reading hosts a contrasting
// border identifies pressed and checked native buttons whose shaded fill is
// too close to the page. Explicit Sass role/state customisations stay native.
@if $primary == $tq-red and $btn-active-bg-shade-amount == 20% and $btn-active-bg-tint-amount == 20% and $btn-active-border-shade-amount == 25% and $btn-active-border-tint-amount == 10% {
  $tq-default-roles: (primary: $tq-red, secondary: $tq-muted, success: $tq-teal-dark, info: $tq-teal, warning: $tq-orange, danger: $tq-red-dark, light: $tq-warm, dark: $tq-indigo);
  :root,
  [data-bs-theme="light"],
  .bg-white {
    @each $role, $value in $theme-colors {
      @if map-get($tq-default-roles, $role) == $value {
        $native-border: if($role == "light" or ($role != "dark" and color-contrast($value) == $color-contrast-light), shade-color($value, $btn-active-border-shade-amount), tint-color($value, $btn-active-border-tint-amount));
        --tq-mode-active-button-border-#{$role}: #{$native-border};
        --tq-mode-active-outline-border-#{$role}: #{$value};
      }
    }
  }
  @if $enable-dark-mode {
    @include color-mode(dark, true) {
      @each $role, $value in $theme-colors {
        @if map-get($tq-default-roles, $role) == $value {
          --tq-mode-active-button-border-#{$role}: #{color-contrast($value)};
          --tq-mode-active-outline-border-#{$role}: #{color-contrast($value)};
        }
      }
    }
  }
  @each $role, $value in $theme-colors {
    @if map-get($tq-default-roles, $role) == $value {
      $native-border: if($role == "light" or ($role != "dark" and color-contrast($value) == $color-contrast-light), shade-color($value, $btn-active-border-shade-amount), tint-color($value, $btn-active-border-tint-amount));
      .btn-#{$role} {
        --#{$prefix}btn-active-border-color: var(--tq-mode-active-button-border-#{$role}, #{$native-border});
      }
      .btn-outline-#{$role} {
        --#{$prefix}btn-active-border-color: var(--tq-mode-active-outline-border-#{$role}, #{$value});
      }
    }
  }
}
`;

export const accessibleOverlay = String.raw`.navbar .btn-outline-primary,
.navbar .btn-outline-success,
.navbar .btn-outline-light {
  --bs-btn-color: var(--bs-navbar-color);
  --bs-btn-border-color: var(--bs-navbar-color);
}

.bg-dark.text-secondary,
.bg-dark .text-secondary,
.text-bg-dark .text-secondary {
  color: #d7d2cb !important;
}

:root,
[data-bs-theme=light] {
  --tq-mode-outline-primary: #e31b23;
  --tq-mode-outline-primary-rgb: 227, 27, 35;
  --tq-mode-outline-secondary: #696567;
  --tq-mode-outline-secondary-rgb: 105, 101, 103;
  --tq-mode-outline-success: #00766c;
  --tq-mode-outline-success-rgb: 0, 118, 108;
  --tq-mode-outline-info: #00a89b;
  --tq-mode-outline-info-rgb: 0, 168, 155;
  --tq-mode-outline-warning: #ff4904;
  --tq-mode-outline-warning-rgb: 255, 73, 4;
  --tq-mode-outline-danger: #8a0008;
  --tq-mode-outline-danger-rgb: 138, 0, 8;
  --tq-mode-outline-light: #f1efed;
  --tq-mode-outline-light-rgb: 241, 239, 237;
  --tq-mode-outline-dark: #091135;
  --tq-mode-outline-dark-rgb: 9, 17, 53;
  --tq-mode-outline-primary-neutral: #8a0008;
  --tq-mode-outline-primary-neutral-rgb: 138, 0, 8;
  --tq-mode-close-focus-reading-rgb: var(--bs-body-color-rgb);
  --tq-mode-close-focus-on-light-rgb: 9, 17, 53;
  --tq-mode-close-focus-on-dark-rgb: 255, 255, 255;
  --tq-mode-range-track-bg: #d7d2cb;
  --tq-mode-range-thumb-bg: #e31b23;
  --tq-mode-range-thumb-active-bg: #8a0008;
  --tq-mode-active-bg: #e31b23;
  --tq-mode-active-colour: #fff;
  --tq-mode-carousel-indicator-inactive-bg: #f1efed;
}

[data-bs-theme=dark] {
  --tq-mode-outline-primary: rgb(238.2, 118.2, 123);
  --tq-mode-outline-primary-rgb: 238, 118, 123;
  --tq-mode-outline-secondary: rgb(165, 162.6, 163.8);
  --tq-mode-outline-secondary-rgb: 165, 163, 164;
  --tq-mode-outline-success: rgb(102, 172.8, 166.8);
  --tq-mode-outline-success-rgb: 102, 173, 167;
  --tq-mode-outline-info: rgb(102, 202.8, 195);
  --tq-mode-outline-info-rgb: 102, 203, 195;
  --tq-mode-outline-warning: rgb(255, 145.8, 104.4);
  --tq-mode-outline-warning-rgb: 255, 146, 104;
  --tq-mode-outline-danger: rgb(208.2, 153, 156.2);
  --tq-mode-outline-danger-rgb: 208, 153, 156;
  --tq-mode-outline-light: #f1efed;
  --tq-mode-outline-light-rgb: 241, 239, 237;
  --tq-mode-outline-dark: #d7d2cb;
  --tq-mode-outline-dark-rgb: 215, 210, 203;
  --tq-mode-outline-primary-neutral: rgb(238.2, 118.2, 123);
  --tq-mode-outline-primary-neutral-rgb: 238, 118, 123;
  --tq-mode-close-focus-reading-rgb: 0, 0, 0;
  --tq-mode-close-focus-on-light-rgb: 255, 255, 255;
  --tq-mode-close-focus-on-dark-rgb: 0, 0, 0;
  --tq-mode-range-track-bg: #091135;
  --tq-mode-range-thumb-bg: #fc545c;
  --tq-mode-range-thumb-active-bg: #fc1721;
  --tq-mode-active-bg: #fc1721;
  --tq-mode-active-colour: #091135;
  --tq-mode-carousel-indicator-inactive-bg: #091135;
}

.btn-outline-primary {
  --bs-btn-color: var(--tq-outline-primary, var(--tq-mode-outline-primary, #e31b23));
  --bs-btn-border-color: var(--tq-outline-primary, var(--tq-mode-outline-primary, #e31b23));
}

.focus-ring-primary {
  --bs-focus-ring-color: rgba(var(--tq-outline-primary-rgb, var(--tq-mode-outline-primary-rgb, 227, 27, 35)), var(--bs-focus-ring-opacity)) !important;
}

.btn-outline-secondary {
  --bs-btn-color: var(--tq-outline-secondary, var(--tq-mode-outline-secondary, #696567));
  --bs-btn-border-color: var(--tq-outline-secondary, var(--tq-mode-outline-secondary, #696567));
}

.focus-ring-secondary {
  --bs-focus-ring-color: rgba(var(--tq-outline-secondary-rgb, var(--tq-mode-outline-secondary-rgb, 105, 101, 103)), var(--bs-focus-ring-opacity)) !important;
}

.btn-outline-success {
  --bs-btn-color: var(--tq-outline-success, var(--tq-mode-outline-success, #00766c));
  --bs-btn-border-color: var(--tq-outline-success, var(--tq-mode-outline-success, #00766c));
}

.focus-ring-success {
  --bs-focus-ring-color: rgba(var(--tq-outline-success-rgb, var(--tq-mode-outline-success-rgb, 0, 118, 108)), var(--bs-focus-ring-opacity)) !important;
}

.btn-outline-info {
  --bs-btn-color: var(--tq-outline-info, var(--tq-mode-outline-info, #00a89b));
  --bs-btn-border-color: var(--tq-outline-info, var(--tq-mode-outline-info, #00a89b));
}

.focus-ring-info {
  --bs-focus-ring-color: rgba(var(--tq-outline-info-rgb, var(--tq-mode-outline-info-rgb, 0, 168, 155)), var(--bs-focus-ring-opacity)) !important;
}

.btn-outline-warning {
  --bs-btn-color: var(--tq-outline-warning, var(--tq-mode-outline-warning, #ff4904));
  --bs-btn-border-color: var(--tq-outline-warning, var(--tq-mode-outline-warning, #ff4904));
}

.focus-ring-warning {
  --bs-focus-ring-color: rgba(var(--tq-outline-warning-rgb, var(--tq-mode-outline-warning-rgb, 255, 73, 4)), var(--bs-focus-ring-opacity)) !important;
}

.btn-outline-danger {
  --bs-btn-color: var(--tq-outline-danger, var(--tq-mode-outline-danger, #8a0008));
  --bs-btn-border-color: var(--tq-outline-danger, var(--tq-mode-outline-danger, #8a0008));
}

.focus-ring-danger {
  --bs-focus-ring-color: rgba(var(--tq-outline-danger-rgb, var(--tq-mode-outline-danger-rgb, 138, 0, 8)), var(--bs-focus-ring-opacity)) !important;
}

.btn-outline-light {
  --bs-btn-color: var(--tq-outline-light, var(--tq-mode-outline-light, #f1efed));
  --bs-btn-border-color: var(--tq-outline-light, var(--tq-mode-outline-light, #f1efed));
}

.focus-ring-light {
  --bs-focus-ring-color: rgba(var(--tq-outline-light-rgb, var(--tq-mode-outline-light-rgb, 241, 239, 237)), var(--bs-focus-ring-opacity)) !important;
}

.btn-outline-dark {
  --bs-btn-color: var(--tq-outline-dark, var(--tq-mode-outline-dark, #091135));
  --bs-btn-border-color: var(--tq-outline-dark, var(--tq-mode-outline-dark, #091135));
}

.focus-ring-dark {
  --bs-focus-ring-color: rgba(var(--tq-outline-dark-rgb, var(--tq-mode-outline-dark-rgb, 9, 17, 53)), var(--bs-focus-ring-opacity)) !important;
}

.focus-ring {
  --bs-focus-ring-color: rgba(var(--tq-focus-ring-rgb, var(--bs-body-color-rgb)), var(--bs-focus-ring-opacity));
}

.card,
.modal-content,
.offcanvas,
.dropdown-menu,
.list-group-item,
.bg-body {
  --tq-range-track-bg: var(--tq-mode-range-track-bg, #d7d2cb);
  --tq-range-thumb-bg: var(--tq-mode-range-thumb-bg, #e31b23);
  --tq-range-thumb-active-bg: var(--tq-mode-range-thumb-active-bg, #8a0008);
  --tq-focus-ring-colour: var(--bs-body-color);
  --tq-focus-ring-rgb: var(--bs-body-color-rgb);
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-reading-rgb, var(--bs-body-color-rgb));
  --tq-outline-primary: var(--tq-mode-outline-primary, #e31b23);
  --tq-outline-primary-rgb: var(--tq-mode-outline-primary-rgb, 227, 27, 35);
  --tq-outline-secondary: var(--tq-mode-outline-secondary, #696567);
  --tq-outline-secondary-rgb: var(--tq-mode-outline-secondary-rgb, 105, 101, 103);
  --tq-outline-success: var(--tq-mode-outline-success, #00766c);
  --tq-outline-success-rgb: var(--tq-mode-outline-success-rgb, 0, 118, 108);
  --tq-outline-info: var(--tq-mode-outline-info, #00a89b);
  --tq-outline-info-rgb: var(--tq-mode-outline-info-rgb, 0, 168, 155);
  --tq-outline-warning: var(--tq-mode-outline-warning, #ff4904);
  --tq-outline-warning-rgb: var(--tq-mode-outline-warning-rgb, 255, 73, 4);
  --tq-outline-danger: var(--tq-mode-outline-danger, #8a0008);
  --tq-outline-danger-rgb: var(--tq-mode-outline-danger-rgb, 138, 0, 8);
  --tq-outline-light: var(--tq-mode-outline-light, #f1efed);
  --tq-outline-light-rgb: var(--tq-mode-outline-light-rgb, 241, 239, 237);
  --tq-outline-dark: var(--tq-mode-outline-dark, #091135);
  --tq-outline-dark-rgb: var(--tq-mode-outline-dark-rgb, 9, 17, 53);
}

.bg-body-secondary,
.bg-body-tertiary {
  --tq-range-track-bg: var(--tq-mode-range-track-bg, #d7d2cb);
  --tq-range-thumb-bg: var(--tq-mode-range-thumb-bg, #e31b23);
  --tq-range-thumb-active-bg: var(--tq-mode-range-thumb-active-bg, #8a0008);
  --tq-focus-ring-colour: var(--bs-body-color);
  --tq-focus-ring-rgb: var(--bs-body-color-rgb);
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-reading-rgb, var(--bs-body-color-rgb));
  --tq-outline-primary: var(--tq-mode-outline-primary, #e31b23);
  --tq-outline-primary-rgb: var(--tq-mode-outline-primary-rgb, 227, 27, 35);
  --tq-outline-secondary: var(--tq-mode-outline-secondary, #696567);
  --tq-outline-secondary-rgb: var(--tq-mode-outline-secondary-rgb, 105, 101, 103);
  --tq-outline-success: var(--tq-mode-outline-success, #00766c);
  --tq-outline-success-rgb: var(--tq-mode-outline-success-rgb, 0, 118, 108);
  --tq-outline-info: var(--tq-mode-outline-info, #00a89b);
  --tq-outline-info-rgb: var(--tq-mode-outline-info-rgb, 0, 168, 155);
  --tq-outline-warning: var(--tq-mode-outline-warning, #ff4904);
  --tq-outline-warning-rgb: var(--tq-mode-outline-warning-rgb, 255, 73, 4);
  --tq-outline-danger: var(--tq-mode-outline-danger, #8a0008);
  --tq-outline-danger-rgb: var(--tq-mode-outline-danger-rgb, 138, 0, 8);
  --tq-outline-light: var(--tq-mode-outline-light, #f1efed);
  --tq-outline-light-rgb: var(--tq-mode-outline-light-rgb, 241, 239, 237);
  --tq-outline-dark: var(--tq-mode-outline-dark, #091135);
  --tq-outline-dark-rgb: var(--tq-mode-outline-dark-rgb, 9, 17, 53);
  --tq-outline-primary: var(--tq-mode-outline-primary-neutral);
  --tq-outline-primary-rgb: var(--tq-mode-outline-primary-neutral-rgb);
}

.bg-white {
  --tq-range-track-bg: #d7d2cb;
  --tq-range-thumb-bg: #e31b23;
  --tq-range-thumb-active-bg: #8a0008;
  --tq-focus-ring-colour: #091135;
  --tq-focus-ring-rgb: 9, 17, 53;
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-on-light-rgb, 9, 17, 53);
  --tq-outline-primary: #e31b23;
  --tq-outline-primary-rgb: 227, 27, 35;
  --tq-outline-secondary: #696567;
  --tq-outline-secondary-rgb: 105, 101, 103;
  --tq-outline-success: #00766c;
  --tq-outline-success-rgb: 0, 118, 108;
  --tq-outline-info: #00a89b;
  --tq-outline-info-rgb: 0, 168, 155;
  --tq-outline-warning: #ff4904;
  --tq-outline-warning-rgb: 255, 73, 4;
  --tq-outline-danger: #8a0008;
  --tq-outline-danger-rgb: 138, 0, 8;
  --tq-outline-light: #f1efed;
  --tq-outline-light-rgb: 241, 239, 237;
  --tq-outline-dark: #091135;
  --tq-outline-dark-rgb: 9, 17, 53;
}

.bg-primary,
.text-bg-primary {
  --tq-focus-ring-colour: #fff;
  --tq-focus-ring-rgb: 255, 255, 255;
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-on-dark-rgb, 255, 255, 255);
  --tq-outline-primary: #fff;
  --tq-outline-primary-rgb: 255, 255, 255;
  --tq-outline-secondary: #fff;
  --tq-outline-secondary-rgb: 255, 255, 255;
  --tq-outline-success: #fff;
  --tq-outline-success-rgb: 255, 255, 255;
  --tq-outline-info: #fff;
  --tq-outline-info-rgb: 255, 255, 255;
  --tq-outline-warning: #fff;
  --tq-outline-warning-rgb: 255, 255, 255;
  --tq-outline-danger: #fff;
  --tq-outline-danger-rgb: 255, 255, 255;
  --tq-outline-light: #fff;
  --tq-outline-light-rgb: 255, 255, 255;
  --tq-outline-dark: #fff;
  --tq-outline-dark-rgb: 255, 255, 255;
}

.bg-secondary,
.text-bg-secondary {
  --tq-focus-ring-colour: #fff;
  --tq-focus-ring-rgb: 255, 255, 255;
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-on-dark-rgb, 255, 255, 255);
  --tq-outline-primary: #fff;
  --tq-outline-primary-rgb: 255, 255, 255;
  --tq-outline-secondary: #fff;
  --tq-outline-secondary-rgb: 255, 255, 255;
  --tq-outline-success: #fff;
  --tq-outline-success-rgb: 255, 255, 255;
  --tq-outline-info: #fff;
  --tq-outline-info-rgb: 255, 255, 255;
  --tq-outline-warning: #fff;
  --tq-outline-warning-rgb: 255, 255, 255;
  --tq-outline-danger: #fff;
  --tq-outline-danger-rgb: 255, 255, 255;
  --tq-outline-light: #fff;
  --tq-outline-light-rgb: 255, 255, 255;
  --tq-outline-dark: #fff;
  --tq-outline-dark-rgb: 255, 255, 255;
}

.bg-success,
.text-bg-success {
  --tq-focus-ring-colour: #fff;
  --tq-focus-ring-rgb: 255, 255, 255;
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-on-dark-rgb, 255, 255, 255);
  --tq-outline-primary: #fff;
  --tq-outline-primary-rgb: 255, 255, 255;
  --tq-outline-secondary: #fff;
  --tq-outline-secondary-rgb: 255, 255, 255;
  --tq-outline-success: #fff;
  --tq-outline-success-rgb: 255, 255, 255;
  --tq-outline-info: #fff;
  --tq-outline-info-rgb: 255, 255, 255;
  --tq-outline-warning: #fff;
  --tq-outline-warning-rgb: 255, 255, 255;
  --tq-outline-danger: #fff;
  --tq-outline-danger-rgb: 255, 255, 255;
  --tq-outline-light: #fff;
  --tq-outline-light-rgb: 255, 255, 255;
  --tq-outline-dark: #fff;
  --tq-outline-dark-rgb: 255, 255, 255;
}

.bg-info,
.text-bg-info {
  --tq-focus-ring-colour: #091135;
  --tq-focus-ring-rgb: 9, 17, 53;
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-on-light-rgb, 9, 17, 53);
  --tq-outline-primary: #091135;
  --tq-outline-primary-rgb: 9, 17, 53;
  --tq-outline-secondary: #091135;
  --tq-outline-secondary-rgb: 9, 17, 53;
  --tq-outline-success: #091135;
  --tq-outline-success-rgb: 9, 17, 53;
  --tq-outline-info: #091135;
  --tq-outline-info-rgb: 9, 17, 53;
  --tq-outline-warning: #091135;
  --tq-outline-warning-rgb: 9, 17, 53;
  --tq-outline-danger: #091135;
  --tq-outline-danger-rgb: 9, 17, 53;
  --tq-outline-light: #091135;
  --tq-outline-light-rgb: 9, 17, 53;
  --tq-outline-dark: #091135;
  --tq-outline-dark-rgb: 9, 17, 53;
}

.bg-warning,
.text-bg-warning {
  --tq-focus-ring-colour: #091135;
  --tq-focus-ring-rgb: 9, 17, 53;
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-on-light-rgb, 9, 17, 53);
  --tq-outline-primary: #091135;
  --tq-outline-primary-rgb: 9, 17, 53;
  --tq-outline-secondary: #091135;
  --tq-outline-secondary-rgb: 9, 17, 53;
  --tq-outline-success: #091135;
  --tq-outline-success-rgb: 9, 17, 53;
  --tq-outline-info: #091135;
  --tq-outline-info-rgb: 9, 17, 53;
  --tq-outline-warning: #091135;
  --tq-outline-warning-rgb: 9, 17, 53;
  --tq-outline-danger: #091135;
  --tq-outline-danger-rgb: 9, 17, 53;
  --tq-outline-light: #091135;
  --tq-outline-light-rgb: 9, 17, 53;
  --tq-outline-dark: #091135;
  --tq-outline-dark-rgb: 9, 17, 53;
}

.bg-danger,
.text-bg-danger {
  --tq-focus-ring-colour: #fff;
  --tq-focus-ring-rgb: 255, 255, 255;
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-on-dark-rgb, 255, 255, 255);
  --tq-outline-primary: #fff;
  --tq-outline-primary-rgb: 255, 255, 255;
  --tq-outline-secondary: #fff;
  --tq-outline-secondary-rgb: 255, 255, 255;
  --tq-outline-success: #fff;
  --tq-outline-success-rgb: 255, 255, 255;
  --tq-outline-info: #fff;
  --tq-outline-info-rgb: 255, 255, 255;
  --tq-outline-warning: #fff;
  --tq-outline-warning-rgb: 255, 255, 255;
  --tq-outline-danger: #fff;
  --tq-outline-danger-rgb: 255, 255, 255;
  --tq-outline-light: #fff;
  --tq-outline-light-rgb: 255, 255, 255;
  --tq-outline-dark: #fff;
  --tq-outline-dark-rgb: 255, 255, 255;
}

.bg-light,
.text-bg-light {
  --tq-focus-ring-colour: #091135;
  --tq-focus-ring-rgb: 9, 17, 53;
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-on-light-rgb, 9, 17, 53);
  --tq-outline-primary: #091135;
  --tq-outline-primary-rgb: 9, 17, 53;
  --tq-outline-secondary: #091135;
  --tq-outline-secondary-rgb: 9, 17, 53;
  --tq-outline-success: #091135;
  --tq-outline-success-rgb: 9, 17, 53;
  --tq-outline-info: #091135;
  --tq-outline-info-rgb: 9, 17, 53;
  --tq-outline-warning: #091135;
  --tq-outline-warning-rgb: 9, 17, 53;
  --tq-outline-danger: #091135;
  --tq-outline-danger-rgb: 9, 17, 53;
  --tq-outline-light: #091135;
  --tq-outline-light-rgb: 9, 17, 53;
  --tq-outline-dark: #091135;
  --tq-outline-dark-rgb: 9, 17, 53;
}

.bg-dark,
.text-bg-dark {
  --tq-focus-ring-colour: #fff;
  --tq-focus-ring-rgb: 255, 255, 255;
  --tq-close-focus-prefilter-rgb: var(--tq-mode-close-focus-on-dark-rgb, 255, 255, 255);
  --tq-outline-primary: #fff;
  --tq-outline-primary-rgb: 255, 255, 255;
  --tq-outline-secondary: #fff;
  --tq-outline-secondary-rgb: 255, 255, 255;
  --tq-outline-success: #fff;
  --tq-outline-success-rgb: 255, 255, 255;
  --tq-outline-info: #fff;
  --tq-outline-info-rgb: 255, 255, 255;
  --tq-outline-warning: #fff;
  --tq-outline-warning-rgb: 255, 255, 255;
  --tq-outline-danger: #fff;
  --tq-outline-danger-rgb: 255, 255, 255;
  --tq-outline-light: #fff;
  --tq-outline-light-rgb: 255, 255, 255;
  --tq-outline-dark: #fff;
  --tq-outline-dark-rgb: 255, 255, 255;
}

.bg-dark,
.text-bg-dark {
  --tq-outline-primary: rgb(243.8, 163.8, 167);
  --tq-outline-primary-rgb: 244, 164, 167;
  --tq-outline-secondary: rgb(195, 193.4, 194.2);
  --tq-outline-secondary-rgb: 195, 193, 194;
  --tq-outline-success: rgb(153, 200.2, 196.2);
  --tq-outline-success-rgb: 153, 200, 196;
  --tq-outline-info: #00a89b;
  --tq-outline-info-rgb: 0, 168, 155;
  --tq-outline-warning: #ff4904;
  --tq-outline-warning-rgb: 255, 73, 4;
  --tq-outline-danger: rgb(208.2, 153, 156.2);
  --tq-outline-danger-rgb: 208, 153, 156;
  --tq-outline-light: #f1efed;
  --tq-outline-light-rgb: 241, 239, 237;
  --tq-outline-dark: rgb(156.6, 159.8, 174.2);
  --tq-outline-dark-rgb: 157, 160, 174;
}

.navbar {
  --tq-focus-ring-colour: var(--bs-navbar-color);
}

.btn {
  --bs-btn-focus-box-shadow: 0 0 0 0.25rem var(--tq-focus-ring-colour, var(--bs-body-color));
}

.navbar .btn-outline-primary,
.navbar .btn-outline-success,
.navbar .btn-outline-light {
  --bs-btn-color: var(--bs-navbar-color);
  --bs-btn-border-color: var(--bs-navbar-color);
}

.btn-close {
  --bs-btn-close-focus-shadow: 0 0 0 0.25rem rgba(var(--tq-close-focus-prefilter-rgb, var(--tq-mode-close-focus-reading-rgb, var(--bs-body-color-rgb))), 1);
}

.btn-close-white {
  --bs-btn-close-focus-shadow: 0 0 0 0.25rem rgba(0, 0, 0, 1);
}

.form-control-plaintext:focus-visible {
  outline: 2px solid var(--tq-focus-ring-colour, var(--bs-body-color));
  outline-offset: 2px;
}

.navbar[data-bs-theme=light] .navbar-toggler-icon {
  --bs-navbar-toggler-icon-bg: inherit;
}

.carousel-indicators [data-bs-target]:not(.active) {
  background-color: var(--tq-carousel-indicator-inactive-bg, var(--tq-mode-carousel-indicator-inactive-bg, #f1efed));
}

.carousel-dark {
  --tq-carousel-indicator-inactive-bg: #091135;
}

.nav-pills {
  --bs-nav-pills-link-active-bg: var(--tq-mode-active-bg, #e31b23);
  --bs-nav-pills-link-active-color: var(--tq-mode-active-colour, #fff);
}

.pagination {
  --bs-pagination-active-bg: var(--tq-mode-active-bg, #e31b23);
  --bs-pagination-active-color: var(--tq-mode-active-colour, #fff);
  --bs-pagination-active-border-color: var(--tq-mode-active-bg, #e31b23);
}

.list-group {
  --bs-list-group-active-bg: var(--tq-mode-active-bg, #e31b23);
  --bs-list-group-active-color: var(--tq-mode-active-colour, #fff);
  --bs-list-group-active-border-color: var(--tq-mode-active-bg, #e31b23);
}

.dropdown-menu {
  --bs-dropdown-link-active-bg: var(--tq-mode-active-bg, #e31b23);
  --bs-dropdown-link-active-color: var(--tq-mode-active-colour, #fff);
}

.dropdown-menu-dark {
  --bs-dropdown-link-active-bg: #e31b23;
  --bs-dropdown-link-active-color: #fff;
  --bs-dropdown-link-active-bg: #fc1721;
  --bs-dropdown-link-active-color: #091135;
}

.nav-tabs {
  --bs-nav-tabs-link-active-border-color: var(--bs-secondary-color) var(--bs-secondary-color) var(--bs-body-bg);
}

:root,
[data-bs-theme=light],
.bg-white {
  --tq-mode-active-button-border-primary: rgb(170.25, 20.25, 26.25);
  --tq-mode-active-outline-border-primary: #e31b23;
  --tq-mode-active-button-border-secondary: rgb(78.75, 75.75, 77.25);
  --tq-mode-active-outline-border-secondary: #696567;
  --tq-mode-active-button-border-success: rgb(0, 88.5, 81);
  --tq-mode-active-outline-border-success: #00766c;
  --tq-mode-active-button-border-info: rgb(25.5, 176.7, 165);
  --tq-mode-active-outline-border-info: #00a89b;
  --tq-mode-active-button-border-warning: rgb(255, 91.2, 29.1);
  --tq-mode-active-outline-border-warning: #ff4904;
  --tq-mode-active-button-border-danger: rgb(103.5, 0, 6);
  --tq-mode-active-outline-border-danger: #8a0008;
  --tq-mode-active-button-border-light: rgb(180.75, 179.25, 177.75);
  --tq-mode-active-outline-border-light: #f1efed;
  --tq-mode-active-button-border-dark: rgb(33.6, 40.8, 73.2);
  --tq-mode-active-outline-border-dark: #091135;
}

[data-bs-theme=dark] {
  --tq-mode-active-button-border-primary: #fff;
  --tq-mode-active-outline-border-primary: #fff;
  --tq-mode-active-button-border-secondary: #fff;
  --tq-mode-active-outline-border-secondary: #fff;
  --tq-mode-active-button-border-success: #fff;
  --tq-mode-active-outline-border-success: #fff;
  --tq-mode-active-button-border-info: #091135;
  --tq-mode-active-outline-border-info: #091135;
  --tq-mode-active-button-border-warning: #091135;
  --tq-mode-active-outline-border-warning: #091135;
  --tq-mode-active-button-border-danger: #fff;
  --tq-mode-active-outline-border-danger: #fff;
  --tq-mode-active-button-border-light: #091135;
  --tq-mode-active-outline-border-light: #091135;
  --tq-mode-active-button-border-dark: #fff;
  --tq-mode-active-outline-border-dark: #fff;
}

.btn-primary {
  --bs-btn-active-border-color: var(--tq-mode-active-button-border-primary, rgb(170.25, 20.25, 26.25));
}

.btn-outline-primary {
  --bs-btn-active-border-color: var(--tq-mode-active-outline-border-primary, #e31b23);
}

.btn-secondary {
  --bs-btn-active-border-color: var(--tq-mode-active-button-border-secondary, rgb(78.75, 75.75, 77.25));
}

.btn-outline-secondary {
  --bs-btn-active-border-color: var(--tq-mode-active-outline-border-secondary, #696567);
}

.btn-success {
  --bs-btn-active-border-color: var(--tq-mode-active-button-border-success, rgb(0, 88.5, 81));
}

.btn-outline-success {
  --bs-btn-active-border-color: var(--tq-mode-active-outline-border-success, #00766c);
}

.btn-info {
  --bs-btn-active-border-color: var(--tq-mode-active-button-border-info, rgb(25.5, 176.7, 165));
}

.btn-outline-info {
  --bs-btn-active-border-color: var(--tq-mode-active-outline-border-info, #00a89b);
}

.btn-warning {
  --bs-btn-active-border-color: var(--tq-mode-active-button-border-warning, rgb(255, 91.2, 29.1));
}

.btn-outline-warning {
  --bs-btn-active-border-color: var(--tq-mode-active-outline-border-warning, #ff4904);
}

.btn-danger {
  --bs-btn-active-border-color: var(--tq-mode-active-button-border-danger, rgb(103.5, 0, 6));
}

.btn-outline-danger {
  --bs-btn-active-border-color: var(--tq-mode-active-outline-border-danger, #8a0008);
}

.btn-light {
  --bs-btn-active-border-color: var(--tq-mode-active-button-border-light, rgb(180.75, 179.25, 177.75));
}

.btn-outline-light {
  --bs-btn-active-border-color: var(--tq-mode-active-outline-border-light, #f1efed);
}

.btn-dark {
  --bs-btn-active-border-color: var(--tq-mode-active-button-border-dark, rgb(33.6, 40.8, 73.2));
}

.btn-outline-dark {
  --bs-btn-active-border-color: var(--tq-mode-active-outline-border-dark, #091135);
}
`;

export const forcedSource = String.raw`// Explicit accessibility adaptation for system high-contrast colour modes.
// Normal-mode Bootstrap geometry, focus paint and native APIs are unchanged.
@media (forced-colors: active) {
  .btn:focus-visible,
  .btn-close:focus-visible,
  .navbar-toggler:focus-visible,
  .nav-link:focus-visible,
  .accordion-button:focus-visible,
  .page-link:focus-visible,
  .form-control:focus-visible,
  .form-control-plaintext:focus-visible,
  .form-select:focus-visible,
  .form-check-input[type="checkbox"]:focus-visible,
  .form-check-input[type="radio"]:focus-visible,
  .form-range:focus-visible,
  .focus-ring:focus-visible,
  .carousel-control-prev:focus-visible,
  .carousel-control-next:focus-visible,
  .btn-check:focus-visible + .btn {
    outline: 2px solid CanvasText;
    outline-offset: 2px;
  }

  // System colours suppress the CSS fill but retain white SVG check glyphs.
  // Native controls restore visible checked state, including checkbox switches.
  .form-check-input[type="checkbox"],
  .form-check-input[type="radio"] {
    appearance: auto;
    background-image: none;
  }

  // Native custom range track/thumb fills both become Canvas and disappear.
  // System paint restores the track and thumb boundary in either colour scheme.
  .form-range::-webkit-slider-runnable-track { background-color: CanvasText; }
  .form-range::-moz-range-track { background-color: CanvasText; }
  .form-range::-webkit-slider-thumb {
    background-color: Canvas;
    border: 1px solid CanvasText;
  }
  .form-range::-moz-range-thumb {
    background-color: Canvas;
    border: 1px solid CanvasText;
  }
  // Mask only glyph surfaces: native SVG paths/sizes and outer focus survive.
  .btn-close {
    position: relative;
    background-image: none;
    filter: none;
  }
  .btn-close::before {
    position: absolute;
    inset: 0;
    content: "";
    pointer-events: none;
    forced-color-adjust: none;
    background-color: CanvasText;
    mask-image: var(--#{$prefix}btn-close-bg);
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: #{$btn-close-width} auto;
  }
  .navbar-toggler-icon {
    forced-color-adjust: none;
    background-color: CanvasText;
    background-image: none;
    mask-image: var(--#{$prefix}navbar-toggler-icon-bg);
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: 100%;
  }
  .accordion-button::after {
    forced-color-adjust: none;
    background-color: CanvasText;
    background-image: none;
    mask-image: var(--#{$prefix}accordion-btn-icon);
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: var(--#{$prefix}accordion-btn-icon-width);
  }
  .accordion-button:not(.collapsed)::after {
    background-image: none;
    mask-image: var(--#{$prefix}accordion-btn-active-icon);
  }
  .carousel-control-prev,
  .carousel-control-next {
    filter: none;
    forced-color-adjust: none;
    background-color: Canvas;
  }
  .carousel-control-prev:focus-visible,
  .carousel-control-next:focus-visible {
    outline-offset: -4px;
  }
  .carousel-control-prev-icon,
  .carousel-control-next-icon {
    forced-color-adjust: none;
    background-color: CanvasText;
    background-image: none;
    filter: none !important;
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: 100% 100%;
  }
  .carousel-control-prev-icon {
    mask-image: escape-svg($carousel-control-prev-icon-bg) #{"/*rtl:" + escape-svg($carousel-control-next-icon-bg) + "*/"};
  }
  .carousel-control-next-icon {
    mask-image: escape-svg($carousel-control-next-icon-bg) #{"/*rtl:" + escape-svg($carousel-control-prev-icon-bg) + "*/"};
  }
  .form-select:not([multiple]):not([size]),
  .form-select:not([multiple])[size="1"] {
    appearance: auto;
    background-image: none;
    min-height: calc(#{$form-select-line-height * 1em} + #{$form-select-padding-y * 2} + #{$form-select-border-width} * 2);
  }
  .form-select.form-select-sm:not([multiple]):not([size]),
  .form-select.form-select-sm:not([multiple])[size="1"] {
    min-height: calc(#{$form-select-line-height * 1em} + #{$form-select-padding-y-sm * 2} + #{$form-select-border-width} * 2);
  }
  .form-select.form-select-lg:not([multiple]):not([size]),
  .form-select.form-select-lg:not([multiple])[size="1"] {
    min-height: calc(#{$form-select-line-height * 1em} + #{$form-select-padding-y-lg * 2} + #{$form-select-border-width} * 2);
  }
  // Firefox's native Bootstrap workaround hides focused text with a shadow;
  // forced colours suppress that shadow, so restore real native field ink.
  .form-select:-moz-focusring {
    color: FieldText;
    text-shadow: none;
  }

  // The user's contrasting system pair keeps values and selected labels readable.
  // Highlight/HighlightText is below AA text contrast in Firefox's light palette.
  .progress-bar,
  .btn-check:checked + .btn,
  .btn.active,
  .nav-pills .nav-link.active,
  .nav-pills .show > .nav-link,
  .nav-tabs .nav-link.active,
  .nav-tabs .nav-item.show .nav-link,
  .list-group-item.active,
  .dropdown-item.active,
  .page-item.active .page-link,
  .page-link.active {
    forced-color-adjust: none;
    color: Canvas;
    background-color: CanvasText;
    border-color: CanvasText;
  }
  // Native bg-* and text-bg-* utilities use !important. Keep every documented
  // progress value and its label on the system pair even in those contexts.
  .progress-bar {
    color: Canvas !important;
    background-color: CanvasText !important;
  }
  .spinner-grow {
    forced-color-adjust: none;
    background-color: CanvasText;
  }
  .carousel-indicators {
    forced-color-adjust: none;
    background-color: Canvas;
  }
  .carousel-indicators [data-bs-target] {
    forced-color-adjust: none;
    background-color: CanvasText !important;
  }
  .carousel-indicators [data-bs-target]:focus-visible {
    outline: 2px solid CanvasText;
    outline-offset: -2px;
  }
}
`;

export const forcedOverlay = String.raw`@media (forced-colors: active) {
  .btn:focus-visible,
  .btn-close:focus-visible,
  .navbar-toggler:focus-visible,
  .nav-link:focus-visible,
  .accordion-button:focus-visible,
  .page-link:focus-visible,
  .form-control:focus-visible,
  .form-control-plaintext:focus-visible,
  .form-select:focus-visible,
  .form-check-input[type=checkbox]:focus-visible,
  .form-check-input[type=radio]:focus-visible,
  .form-range:focus-visible,
  .focus-ring:focus-visible,
  .carousel-control-prev:focus-visible,
  .carousel-control-next:focus-visible,
  .btn-check:focus-visible + .btn {
    outline: 2px solid CanvasText;
    outline-offset: 2px;
  }
  .form-check-input[type=checkbox],
  .form-check-input[type=radio] {
    -webkit-appearance: auto;
    -moz-appearance: auto;
    appearance: auto;
    background-image: none;
  }
  .form-range::-webkit-slider-runnable-track {
    background-color: CanvasText;
  }
  .form-range::-moz-range-track {
    background-color: CanvasText;
  }
  .form-range::-webkit-slider-thumb {
    background-color: Canvas;
    border: 1px solid CanvasText;
  }
  .form-range::-moz-range-thumb {
    background-color: Canvas;
    border: 1px solid CanvasText;
  }
  .btn-close {
    position: relative;
    background-image: none;
    filter: none;
  }
  .btn-close::before {
    position: absolute;
    inset: 0;
    content: "";
    pointer-events: none;
    forced-color-adjust: none;
    background-color: CanvasText;
    -webkit-mask-image: var(--bs-btn-close-bg);
    mask-image: var(--bs-btn-close-bg);
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: 1em auto;
    mask-size: 1em auto;
  }
  .navbar-toggler-icon {
    forced-color-adjust: none;
    background-color: CanvasText;
    background-image: none;
    -webkit-mask-image: var(--bs-navbar-toggler-icon-bg);
    mask-image: var(--bs-navbar-toggler-icon-bg);
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: 100%;
    mask-size: 100%;
  }
  .accordion-button::after {
    forced-color-adjust: none;
    background-color: CanvasText;
    background-image: none;
    -webkit-mask-image: var(--bs-accordion-btn-icon);
    mask-image: var(--bs-accordion-btn-icon);
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: var(--bs-accordion-btn-icon-width);
    mask-size: var(--bs-accordion-btn-icon-width);
  }
  .accordion-button:not(.collapsed)::after {
    background-image: none;
    -webkit-mask-image: var(--bs-accordion-btn-active-icon);
    mask-image: var(--bs-accordion-btn-active-icon);
  }
  .carousel-control-prev,
  .carousel-control-next {
    filter: none;
    forced-color-adjust: none;
    background-color: Canvas;
  }
  .carousel-control-prev:focus-visible,
  .carousel-control-next:focus-visible {
    outline-offset: -4px;
  }
  .carousel-control-prev-icon,
  .carousel-control-next-icon {
    forced-color-adjust: none;
    background-color: CanvasText;
    background-image: none;
    filter: none !important;
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
  }
  .carousel-control-prev-icon {
    -webkit-mask-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23fff'%3e%3cpath d='M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0'/%3e%3c/svg%3e") /*rtl:url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23fff'%3e%3cpath d='M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708'/%3e%3c/svg%3e")*/;
    mask-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23fff'%3e%3cpath d='M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0'/%3e%3c/svg%3e") /*rtl:url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23fff'%3e%3cpath d='M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708'/%3e%3c/svg%3e")*/;
  }
  .carousel-control-next-icon {
    -webkit-mask-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23fff'%3e%3cpath d='M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708'/%3e%3c/svg%3e") /*rtl:url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23fff'%3e%3cpath d='M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0'/%3e%3c/svg%3e")*/;
    mask-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23fff'%3e%3cpath d='M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708'/%3e%3c/svg%3e") /*rtl:url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23fff'%3e%3cpath d='M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0'/%3e%3c/svg%3e")*/;
  }
  .form-select:not([multiple]):not([size]),
  .form-select:not([multiple])[size="1"] {
    -webkit-appearance: auto;
    -moz-appearance: auto;
    appearance: auto;
    background-image: none;
    min-height: calc(1.5em + 0.75rem + var(--bs-border-width) * 2);
  }
  .form-select.form-select-sm:not([multiple]):not([size]),
  .form-select.form-select-sm:not([multiple])[size="1"] {
    min-height: calc(1.5em + 0.5rem + var(--bs-border-width) * 2);
  }
  .form-select.form-select-lg:not([multiple]):not([size]),
  .form-select.form-select-lg:not([multiple])[size="1"] {
    min-height: calc(1.5em + 1rem + var(--bs-border-width) * 2);
  }
  .form-select:-moz-focusring {
    color: FieldText;
    text-shadow: none;
  }
  .progress-bar,
  .btn-check:checked + .btn,
  .btn.active,
  .nav-pills .nav-link.active,
  .nav-pills .show > .nav-link,
  .nav-tabs .nav-link.active,
  .nav-tabs .nav-item.show .nav-link,
  .list-group-item.active,
  .dropdown-item.active,
  .page-item.active .page-link,
  .page-link.active {
    forced-color-adjust: none;
    color: Canvas;
    background-color: CanvasText;
    border-color: CanvasText;
  }
  .progress-bar {
    color: Canvas !important;
    background-color: CanvasText !important;
  }
  .spinner-grow {
    forced-color-adjust: none;
    background-color: CanvasText;
  }
  .carousel-indicators {
    forced-color-adjust: none;
    background-color: Canvas;
  }
  .carousel-indicators [data-bs-target] {
    forced-color-adjust: none;
    background-color: CanvasText !important;
  }
  .carousel-indicators [data-bs-target]:focus-visible {
    outline: 2px solid CanvasText;
    outline-offset: -2px;
  }
}
`;

export const utilitySource = String.raw`// Standalone utilities share the full framework's supported focus/reading paint.
// This partial adds no component selectors or geometry. Direct distribution
// tests protect parity with the full framework in both native colour modes.

// A fixed light-mode secondary colour cannot serve as reading text on the
// explicitly dark native example surfaces. Limit the adaptation to that
// concrete colour context, leaving the general text-secondary utility intact.
.bg-dark.text-secondary,
.bg-dark .text-secondary,
.text-bg-dark .text-secondary {
  color: #{$tq-koala} !important;
}

// Mode defaults retain the semantic bases on light reading surfaces. Dark
// reading surfaces use their native emphasis tints for readable outlined ink.
:root,
[data-bs-theme="light"] {
  @each $role, $value in $theme-colors {
    --tq-mode-outline-#{$role}: #{$value};
    --tq-mode-outline-#{$role}-rgb: #{to-rgb($value)};
  }
  --tq-mode-outline-primary-neutral: #{$tq-red-dark};
  --tq-mode-outline-primary-neutral-rgb: #{to-rgb($tq-red-dark)};
}
@if $enable-dark-mode {
  @include color-mode(dark, true) {
  $dark-inks: (primary: $primary-text-emphasis-dark, secondary: $secondary-text-emphasis-dark, success: $success-text-emphasis-dark, info: $info-text-emphasis-dark, warning: $warning-text-emphasis-dark, danger: $danger-text-emphasis-dark, light: $light-text-emphasis-dark, dark: $dark-text-emphasis-dark);
  @each $role, $value in $theme-colors {
    $ink: if(map-has-key($dark-inks, $role), map-get($dark-inks, $role), tint-color($value, 40%));
    --tq-mode-outline-#{$role}: #{$ink};
    --tq-mode-outline-#{$role}-rgb: #{to-rgb($ink)};
  }
  --tq-mode-outline-primary-neutral: #{$primary-text-emphasis-dark};
  --tq-mode-outline-primary-neutral-rgb: #{to-rgb($primary-text-emphasis-dark)};
}
}
@each $role, $value in $theme-colors {
  .focus-ring-#{$role} {
    --#{$prefix}focus-ring-color: rgba(var(--tq-outline-#{$role}-rgb, var(--tq-mode-outline-#{$role}-rgb, #{to-rgb($value)})), var(--#{$prefix}focus-ring-opacity)) !important;
  }
}
.focus-ring {
  --#{$prefix}focus-ring-color: rgba(var(--tq-focus-ring-rgb, var(--#{$prefix}body-color-rgb)), var(--#{$prefix}focus-ring-opacity));
}

// Use inherited host tokens rather than descendant overrides: a nested reading
// panel resets its own context, regardless of its coloured ancestor's selector.
.bg-body {
  --tq-focus-ring-colour: var(--#{$prefix}body-color);
  --tq-focus-ring-rgb: var(--#{$prefix}body-color-rgb);
  @each $role, $value in $theme-colors {
    --tq-outline-#{$role}: var(--tq-mode-outline-#{$role}, #{$value});
    --tq-outline-#{$role}-rgb: var(--tq-mode-outline-#{$role}-rgb, #{to-rgb($value)});
  }
}
.bg-body-secondary,
.bg-body-tertiary {
  --tq-focus-ring-colour: var(--#{$prefix}body-color);
  --tq-focus-ring-rgb: var(--#{$prefix}body-color-rgb);
  @each $role, $value in $theme-colors {
    --tq-outline-#{$role}: var(--tq-mode-outline-#{$role}, #{$value});
    --tq-outline-#{$role}-rgb: var(--tq-mode-outline-#{$role}-rgb, #{to-rgb($value)});
  }
  --tq-outline-primary: var(--tq-mode-outline-primary-neutral);
  --tq-outline-primary-rgb: var(--tq-mode-outline-primary-neutral-rgb);
}
.bg-white {
  --tq-focus-ring-colour: #{$tq-indigo};
  --tq-focus-ring-rgb: #{to-rgb($tq-indigo)};
  @each $role, $value in $theme-colors {
    --tq-outline-#{$role}: #{$value};
    --tq-outline-#{$role}-rgb: #{to-rgb($value)};
  }
}
@each $host, $surface in $theme-colors {
  .bg-#{$host},
  .text-bg-#{$host} {
    $ink: color-contrast($surface);
    --tq-focus-ring-colour: #{$ink};
    --tq-focus-ring-rgb: #{to-rgb($ink)};
    @each $role, $value in $theme-colors {
      --tq-outline-#{$role}: #{$ink};
      --tq-outline-#{$role}-rgb: #{to-rgb($ink)};
    }
  }
}
// Indigo safely retains the original bright-role outlines. Darker role inks
// need a light tint even when the surrounding document uses the light mode.
.bg-dark,
.text-bg-dark {
  @each $role, $value in $theme-colors {
    $ink: if(contrast-ratio($dark, $value) >= 4.5, $value, tint-color($value, 60%));
    --tq-outline-#{$role}: #{$ink};
    --tq-outline-#{$role}-rgb: #{to-rgb($ink)};
  }
}

// System high contrast removes native helper shadows and its outline is zero.
@media (forced-colors: active) {
  .focus-ring:focus-visible {
    outline: 2px solid CanvasText;
    outline-offset: 2px;
  }
}
`;

export const utilityOverlay = String.raw`.bg-dark.text-secondary,
.bg-dark .text-secondary,
.text-bg-dark .text-secondary {
  color: #d7d2cb !important;
}

:root,
[data-bs-theme=light] {
  --tq-mode-outline-primary: #e31b23;
  --tq-mode-outline-primary-rgb: 227, 27, 35;
  --tq-mode-outline-secondary: #696567;
  --tq-mode-outline-secondary-rgb: 105, 101, 103;
  --tq-mode-outline-success: #00766c;
  --tq-mode-outline-success-rgb: 0, 118, 108;
  --tq-mode-outline-info: #00a89b;
  --tq-mode-outline-info-rgb: 0, 168, 155;
  --tq-mode-outline-warning: #ff4904;
  --tq-mode-outline-warning-rgb: 255, 73, 4;
  --tq-mode-outline-danger: #8a0008;
  --tq-mode-outline-danger-rgb: 138, 0, 8;
  --tq-mode-outline-light: #f1efed;
  --tq-mode-outline-light-rgb: 241, 239, 237;
  --tq-mode-outline-dark: #091135;
  --tq-mode-outline-dark-rgb: 9, 17, 53;
  --tq-mode-outline-primary-neutral: #8a0008;
  --tq-mode-outline-primary-neutral-rgb: 138, 0, 8;
}

[data-bs-theme=dark] {
  --tq-mode-outline-primary: rgb(238.2, 118.2, 123);
  --tq-mode-outline-primary-rgb: 238, 118, 123;
  --tq-mode-outline-secondary: rgb(165, 162.6, 163.8);
  --tq-mode-outline-secondary-rgb: 165, 163, 164;
  --tq-mode-outline-success: rgb(102, 172.8, 166.8);
  --tq-mode-outline-success-rgb: 102, 173, 167;
  --tq-mode-outline-info: rgb(102, 202.8, 195);
  --tq-mode-outline-info-rgb: 102, 203, 195;
  --tq-mode-outline-warning: rgb(255, 145.8, 104.4);
  --tq-mode-outline-warning-rgb: 255, 146, 104;
  --tq-mode-outline-danger: rgb(208.2, 153, 156.2);
  --tq-mode-outline-danger-rgb: 208, 153, 156;
  --tq-mode-outline-light: #f1efed;
  --tq-mode-outline-light-rgb: 241, 239, 237;
  --tq-mode-outline-dark: #d7d2cb;
  --tq-mode-outline-dark-rgb: 215, 210, 203;
  --tq-mode-outline-primary-neutral: rgb(238.2, 118.2, 123);
  --tq-mode-outline-primary-neutral-rgb: 238, 118, 123;
}

.focus-ring-primary {
  --bs-focus-ring-color: rgba(var(--tq-outline-primary-rgb, var(--tq-mode-outline-primary-rgb, 227, 27, 35)), var(--bs-focus-ring-opacity)) !important;
}

.focus-ring-secondary {
  --bs-focus-ring-color: rgba(var(--tq-outline-secondary-rgb, var(--tq-mode-outline-secondary-rgb, 105, 101, 103)), var(--bs-focus-ring-opacity)) !important;
}

.focus-ring-success {
  --bs-focus-ring-color: rgba(var(--tq-outline-success-rgb, var(--tq-mode-outline-success-rgb, 0, 118, 108)), var(--bs-focus-ring-opacity)) !important;
}

.focus-ring-info {
  --bs-focus-ring-color: rgba(var(--tq-outline-info-rgb, var(--tq-mode-outline-info-rgb, 0, 168, 155)), var(--bs-focus-ring-opacity)) !important;
}

.focus-ring-warning {
  --bs-focus-ring-color: rgba(var(--tq-outline-warning-rgb, var(--tq-mode-outline-warning-rgb, 255, 73, 4)), var(--bs-focus-ring-opacity)) !important;
}

.focus-ring-danger {
  --bs-focus-ring-color: rgba(var(--tq-outline-danger-rgb, var(--tq-mode-outline-danger-rgb, 138, 0, 8)), var(--bs-focus-ring-opacity)) !important;
}

.focus-ring-light {
  --bs-focus-ring-color: rgba(var(--tq-outline-light-rgb, var(--tq-mode-outline-light-rgb, 241, 239, 237)), var(--bs-focus-ring-opacity)) !important;
}

.focus-ring-dark {
  --bs-focus-ring-color: rgba(var(--tq-outline-dark-rgb, var(--tq-mode-outline-dark-rgb, 9, 17, 53)), var(--bs-focus-ring-opacity)) !important;
}

.focus-ring {
  --bs-focus-ring-color: rgba(var(--tq-focus-ring-rgb, var(--bs-body-color-rgb)), var(--bs-focus-ring-opacity));
}

.bg-body {
  --tq-focus-ring-colour: var(--bs-body-color);
  --tq-focus-ring-rgb: var(--bs-body-color-rgb);
  --tq-outline-primary: var(--tq-mode-outline-primary, #e31b23);
  --tq-outline-primary-rgb: var(--tq-mode-outline-primary-rgb, 227, 27, 35);
  --tq-outline-secondary: var(--tq-mode-outline-secondary, #696567);
  --tq-outline-secondary-rgb: var(--tq-mode-outline-secondary-rgb, 105, 101, 103);
  --tq-outline-success: var(--tq-mode-outline-success, #00766c);
  --tq-outline-success-rgb: var(--tq-mode-outline-success-rgb, 0, 118, 108);
  --tq-outline-info: var(--tq-mode-outline-info, #00a89b);
  --tq-outline-info-rgb: var(--tq-mode-outline-info-rgb, 0, 168, 155);
  --tq-outline-warning: var(--tq-mode-outline-warning, #ff4904);
  --tq-outline-warning-rgb: var(--tq-mode-outline-warning-rgb, 255, 73, 4);
  --tq-outline-danger: var(--tq-mode-outline-danger, #8a0008);
  --tq-outline-danger-rgb: var(--tq-mode-outline-danger-rgb, 138, 0, 8);
  --tq-outline-light: var(--tq-mode-outline-light, #f1efed);
  --tq-outline-light-rgb: var(--tq-mode-outline-light-rgb, 241, 239, 237);
  --tq-outline-dark: var(--tq-mode-outline-dark, #091135);
  --tq-outline-dark-rgb: var(--tq-mode-outline-dark-rgb, 9, 17, 53);
}

.bg-body-secondary,
.bg-body-tertiary {
  --tq-focus-ring-colour: var(--bs-body-color);
  --tq-focus-ring-rgb: var(--bs-body-color-rgb);
  --tq-outline-primary: var(--tq-mode-outline-primary, #e31b23);
  --tq-outline-primary-rgb: var(--tq-mode-outline-primary-rgb, 227, 27, 35);
  --tq-outline-secondary: var(--tq-mode-outline-secondary, #696567);
  --tq-outline-secondary-rgb: var(--tq-mode-outline-secondary-rgb, 105, 101, 103);
  --tq-outline-success: var(--tq-mode-outline-success, #00766c);
  --tq-outline-success-rgb: var(--tq-mode-outline-success-rgb, 0, 118, 108);
  --tq-outline-info: var(--tq-mode-outline-info, #00a89b);
  --tq-outline-info-rgb: var(--tq-mode-outline-info-rgb, 0, 168, 155);
  --tq-outline-warning: var(--tq-mode-outline-warning, #ff4904);
  --tq-outline-warning-rgb: var(--tq-mode-outline-warning-rgb, 255, 73, 4);
  --tq-outline-danger: var(--tq-mode-outline-danger, #8a0008);
  --tq-outline-danger-rgb: var(--tq-mode-outline-danger-rgb, 138, 0, 8);
  --tq-outline-light: var(--tq-mode-outline-light, #f1efed);
  --tq-outline-light-rgb: var(--tq-mode-outline-light-rgb, 241, 239, 237);
  --tq-outline-dark: var(--tq-mode-outline-dark, #091135);
  --tq-outline-dark-rgb: var(--tq-mode-outline-dark-rgb, 9, 17, 53);
  --tq-outline-primary: var(--tq-mode-outline-primary-neutral);
  --tq-outline-primary-rgb: var(--tq-mode-outline-primary-neutral-rgb);
}

.bg-white {
  --tq-focus-ring-colour: #091135;
  --tq-focus-ring-rgb: 9, 17, 53;
  --tq-outline-primary: #e31b23;
  --tq-outline-primary-rgb: 227, 27, 35;
  --tq-outline-secondary: #696567;
  --tq-outline-secondary-rgb: 105, 101, 103;
  --tq-outline-success: #00766c;
  --tq-outline-success-rgb: 0, 118, 108;
  --tq-outline-info: #00a89b;
  --tq-outline-info-rgb: 0, 168, 155;
  --tq-outline-warning: #ff4904;
  --tq-outline-warning-rgb: 255, 73, 4;
  --tq-outline-danger: #8a0008;
  --tq-outline-danger-rgb: 138, 0, 8;
  --tq-outline-light: #f1efed;
  --tq-outline-light-rgb: 241, 239, 237;
  --tq-outline-dark: #091135;
  --tq-outline-dark-rgb: 9, 17, 53;
}

.bg-primary,
.text-bg-primary {
  --tq-focus-ring-colour: #fff;
  --tq-focus-ring-rgb: 255, 255, 255;
  --tq-outline-primary: #fff;
  --tq-outline-primary-rgb: 255, 255, 255;
  --tq-outline-secondary: #fff;
  --tq-outline-secondary-rgb: 255, 255, 255;
  --tq-outline-success: #fff;
  --tq-outline-success-rgb: 255, 255, 255;
  --tq-outline-info: #fff;
  --tq-outline-info-rgb: 255, 255, 255;
  --tq-outline-warning: #fff;
  --tq-outline-warning-rgb: 255, 255, 255;
  --tq-outline-danger: #fff;
  --tq-outline-danger-rgb: 255, 255, 255;
  --tq-outline-light: #fff;
  --tq-outline-light-rgb: 255, 255, 255;
  --tq-outline-dark: #fff;
  --tq-outline-dark-rgb: 255, 255, 255;
}

.bg-secondary,
.text-bg-secondary {
  --tq-focus-ring-colour: #fff;
  --tq-focus-ring-rgb: 255, 255, 255;
  --tq-outline-primary: #fff;
  --tq-outline-primary-rgb: 255, 255, 255;
  --tq-outline-secondary: #fff;
  --tq-outline-secondary-rgb: 255, 255, 255;
  --tq-outline-success: #fff;
  --tq-outline-success-rgb: 255, 255, 255;
  --tq-outline-info: #fff;
  --tq-outline-info-rgb: 255, 255, 255;
  --tq-outline-warning: #fff;
  --tq-outline-warning-rgb: 255, 255, 255;
  --tq-outline-danger: #fff;
  --tq-outline-danger-rgb: 255, 255, 255;
  --tq-outline-light: #fff;
  --tq-outline-light-rgb: 255, 255, 255;
  --tq-outline-dark: #fff;
  --tq-outline-dark-rgb: 255, 255, 255;
}

.bg-success,
.text-bg-success {
  --tq-focus-ring-colour: #fff;
  --tq-focus-ring-rgb: 255, 255, 255;
  --tq-outline-primary: #fff;
  --tq-outline-primary-rgb: 255, 255, 255;
  --tq-outline-secondary: #fff;
  --tq-outline-secondary-rgb: 255, 255, 255;
  --tq-outline-success: #fff;
  --tq-outline-success-rgb: 255, 255, 255;
  --tq-outline-info: #fff;
  --tq-outline-info-rgb: 255, 255, 255;
  --tq-outline-warning: #fff;
  --tq-outline-warning-rgb: 255, 255, 255;
  --tq-outline-danger: #fff;
  --tq-outline-danger-rgb: 255, 255, 255;
  --tq-outline-light: #fff;
  --tq-outline-light-rgb: 255, 255, 255;
  --tq-outline-dark: #fff;
  --tq-outline-dark-rgb: 255, 255, 255;
}

.bg-info,
.text-bg-info {
  --tq-focus-ring-colour: #091135;
  --tq-focus-ring-rgb: 9, 17, 53;
  --tq-outline-primary: #091135;
  --tq-outline-primary-rgb: 9, 17, 53;
  --tq-outline-secondary: #091135;
  --tq-outline-secondary-rgb: 9, 17, 53;
  --tq-outline-success: #091135;
  --tq-outline-success-rgb: 9, 17, 53;
  --tq-outline-info: #091135;
  --tq-outline-info-rgb: 9, 17, 53;
  --tq-outline-warning: #091135;
  --tq-outline-warning-rgb: 9, 17, 53;
  --tq-outline-danger: #091135;
  --tq-outline-danger-rgb: 9, 17, 53;
  --tq-outline-light: #091135;
  --tq-outline-light-rgb: 9, 17, 53;
  --tq-outline-dark: #091135;
  --tq-outline-dark-rgb: 9, 17, 53;
}

.bg-warning,
.text-bg-warning {
  --tq-focus-ring-colour: #091135;
  --tq-focus-ring-rgb: 9, 17, 53;
  --tq-outline-primary: #091135;
  --tq-outline-primary-rgb: 9, 17, 53;
  --tq-outline-secondary: #091135;
  --tq-outline-secondary-rgb: 9, 17, 53;
  --tq-outline-success: #091135;
  --tq-outline-success-rgb: 9, 17, 53;
  --tq-outline-info: #091135;
  --tq-outline-info-rgb: 9, 17, 53;
  --tq-outline-warning: #091135;
  --tq-outline-warning-rgb: 9, 17, 53;
  --tq-outline-danger: #091135;
  --tq-outline-danger-rgb: 9, 17, 53;
  --tq-outline-light: #091135;
  --tq-outline-light-rgb: 9, 17, 53;
  --tq-outline-dark: #091135;
  --tq-outline-dark-rgb: 9, 17, 53;
}

.bg-danger,
.text-bg-danger {
  --tq-focus-ring-colour: #fff;
  --tq-focus-ring-rgb: 255, 255, 255;
  --tq-outline-primary: #fff;
  --tq-outline-primary-rgb: 255, 255, 255;
  --tq-outline-secondary: #fff;
  --tq-outline-secondary-rgb: 255, 255, 255;
  --tq-outline-success: #fff;
  --tq-outline-success-rgb: 255, 255, 255;
  --tq-outline-info: #fff;
  --tq-outline-info-rgb: 255, 255, 255;
  --tq-outline-warning: #fff;
  --tq-outline-warning-rgb: 255, 255, 255;
  --tq-outline-danger: #fff;
  --tq-outline-danger-rgb: 255, 255, 255;
  --tq-outline-light: #fff;
  --tq-outline-light-rgb: 255, 255, 255;
  --tq-outline-dark: #fff;
  --tq-outline-dark-rgb: 255, 255, 255;
}

.bg-light,
.text-bg-light {
  --tq-focus-ring-colour: #091135;
  --tq-focus-ring-rgb: 9, 17, 53;
  --tq-outline-primary: #091135;
  --tq-outline-primary-rgb: 9, 17, 53;
  --tq-outline-secondary: #091135;
  --tq-outline-secondary-rgb: 9, 17, 53;
  --tq-outline-success: #091135;
  --tq-outline-success-rgb: 9, 17, 53;
  --tq-outline-info: #091135;
  --tq-outline-info-rgb: 9, 17, 53;
  --tq-outline-warning: #091135;
  --tq-outline-warning-rgb: 9, 17, 53;
  --tq-outline-danger: #091135;
  --tq-outline-danger-rgb: 9, 17, 53;
  --tq-outline-light: #091135;
  --tq-outline-light-rgb: 9, 17, 53;
  --tq-outline-dark: #091135;
  --tq-outline-dark-rgb: 9, 17, 53;
}

.bg-dark,
.text-bg-dark {
  --tq-focus-ring-colour: #fff;
  --tq-focus-ring-rgb: 255, 255, 255;
  --tq-outline-primary: #fff;
  --tq-outline-primary-rgb: 255, 255, 255;
  --tq-outline-secondary: #fff;
  --tq-outline-secondary-rgb: 255, 255, 255;
  --tq-outline-success: #fff;
  --tq-outline-success-rgb: 255, 255, 255;
  --tq-outline-info: #fff;
  --tq-outline-info-rgb: 255, 255, 255;
  --tq-outline-warning: #fff;
  --tq-outline-warning-rgb: 255, 255, 255;
  --tq-outline-danger: #fff;
  --tq-outline-danger-rgb: 255, 255, 255;
  --tq-outline-light: #fff;
  --tq-outline-light-rgb: 255, 255, 255;
  --tq-outline-dark: #fff;
  --tq-outline-dark-rgb: 255, 255, 255;
}

.bg-dark,
.text-bg-dark {
  --tq-outline-primary: rgb(243.8, 163.8, 167);
  --tq-outline-primary-rgb: 244, 164, 167;
  --tq-outline-secondary: rgb(195, 193.4, 194.2);
  --tq-outline-secondary-rgb: 195, 193, 194;
  --tq-outline-success: rgb(153, 200.2, 196.2);
  --tq-outline-success-rgb: 153, 200, 196;
  --tq-outline-info: #00a89b;
  --tq-outline-info-rgb: 0, 168, 155;
  --tq-outline-warning: #ff4904;
  --tq-outline-warning-rgb: 255, 73, 4;
  --tq-outline-danger: rgb(208.2, 153, 156.2);
  --tq-outline-danger-rgb: 208, 153, 156;
  --tq-outline-light: #f1efed;
  --tq-outline-light-rgb: 241, 239, 237;
  --tq-outline-dark: rgb(156.6, 159.8, 174.2);
  --tq-outline-dark-rgb: 157, 160, 174;
}

@media (forced-colors: active) {
  .focus-ring:focus-visible {
    outline: 2px solid CanvasText;
    outline-offset: 2px;
  }
}
`;

export const utilityEntry = String.raw`// Colour substitutions only; utilities retain Bootstrap's original defaults.
@import "bootstrap/scss/functions";
@import "tokens";
@import "bootstrap/scss/bootstrap-utilities";
@import "accessible-utility-colours";
`;
