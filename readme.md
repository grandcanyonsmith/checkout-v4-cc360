# Course Creator 360 - Modern React Checkout

A modern, responsive checkout application built with React, Vite, HeadlessUI, and Tailwind CSS.

## ✨ Features

- **Modern React Stack**: Built with React 18, Vite, and TypeScript support
- **HeadlessUI Components**: Accessible, unstyled UI components
- **Mobile-First Design**: Fully responsive and mobile-optimized
- **Form Validation**: Real-time validation with React Hook Form and Zod
- **Stripe Integration**: Secure payment processing with React Stripe.js
- **Password Strength**: Interactive password requirements with visual feedback
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation
- **Performance**: Optimized with lazy loading and minimal bundle size

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Stripe account (for payment processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd checkout-v4-cc360
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your Stripe keys:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
   STRIPE_SECRET_KEY=sk_test_your_secret_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- `npm run server` - Start backend API server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

### Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── CheckoutForm.jsx # Main checkout form
│   │   ├── OrderSummary.jsx # Pricing summary
│   │   ├── FormField.jsx    # Reusable form field
│   │   └── ...
│   ├── utils/               # Utility functions
│   │   ├── validation.js    # Zod schemas & validation
│   │   └── cn.js           # Class name utility
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   └── types/              # TypeScript types
├── server/                 # Express API server
├── legacy-public/          # Original vanilla JS version
├── legacy-src/            # Original source files
└── public/                # Static assets
```

## 🎨 Design System

### Colors
- **Primary**: Blue scale (600-900) for CTA buttons and accents
- **Success**: Green for validation success states
- **Error**: Red for validation errors and alerts
- **Neutral**: Gray scale for text and backgrounds

### Components
- Built with HeadlessUI for accessibility
- Tailwind CSS for consistent styling
- Custom CSS components for reusable patterns
- Mobile-first responsive design

## 🔒 Security Features

- **Form Validation**: Client and server-side validation
- **Stripe Elements**: PCI-compliant payment handling
- **HTTPS Only**: Secure data transmission
- **Input Sanitization**: XSS protection
- **Error Boundaries**: Graceful error handling

## 📱 Mobile Responsiveness

- **Breakpoints**: Mobile (320px+), Tablet (768px+), Desktop (1024px+)
- **Touch Friendly**: Large tap targets and optimized interactions
- **Performance**: Optimized images and lazy loading
- **Progressive Enhancement**: Works without JavaScript

## 🧪 Testing

Run the test suite:
```bash
npm run test
```

For UI testing:
```bash
npm run test:ui
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

The `dist/` folder contains the production build ready for deployment.

### Vercel Deployment
This project is optimized for Vercel deployment with automatic builds and serverless functions.

## 🔧 Configuration

### Environment Variables

**Client (Vite)**:
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

**Server**:
- `STRIPE_SECRET_KEY` - Stripe secret key
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

### Stripe Configuration
1. Create a Stripe account
2. Get your API keys from the Stripe Dashboard
3. Add your keys to the `.env` file
4. Configure your pricing in `src/App.jsx`

## 📖 API Endpoints

- `POST /api/create-subscription` - Create Stripe customer and subscription
- `POST /api/create-payment-intent` - Create payment intent for processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the UNLICENSED license - see the LICENSE file for details.

## 🆘 Support

For questions or support, please contact the Course Creator 360 team or open an issue on GitHub.

---

## Migration from Legacy Version

The original vanilla JavaScript version has been moved to `legacy-public/` and `legacy-src/` directories. The new React version provides:

- ✅ Better maintainability and developer experience
- ✅ Improved accessibility and mobile responsiveness
- ✅ Modern development workflow with hot reload
- ✅ Type safety with TypeScript support
- ✅ Better error handling and user feedback
- ✅ Enhanced security with proper validation 