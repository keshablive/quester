# Visual Regression Testing

This directory stores baseline screenshots for visual regression testing.

## Structure

```
visual-regression/
├── feed/               # Feed screen baselines
│   ├── light-mode.png
│   └── dark-mode.png
├── profile/            # Profile screen baselines
│   ├── light-mode.png
│   └── dark-mode.png
├── courses/            # Course screens baselines
│   └── ...
├── marketplace/        # Marketplace screens baselines
│   └── ...
└── components/         # Individual component baselines
    ├── button/
    ├── card/
    └── ...
```

## Capturing Baselines

Run the baseline capture script:

```bash
cd client
npm run test:visual:baseline
```

## Running Tests

```bash
cd client
npm run test:visual
```

## Configuration

Visual regression tests use `jest-image-snapshot` with the following thresholds:
- Failure threshold: 0.01 (1% difference allowed)
- Pixel threshold: 0.1
- Compare mode: light and dark themes separately
