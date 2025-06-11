# VPN PWA Frontend

A Progressive Web Application (PWA) for secure cloud proxy browsing built with React, TypeScript, Supabase, and Tailwind CSS.

## 🚀 Features

- **Secure Authentication** - Supabase Auth with email/password
- **Proxy Session Management** - Start and manage secure proxy sessions
- **Real-time Updates** - Live session status and usage tracking
- **Progressive Web App** - Installable with offline capabilities
- **Responsive Design** - Modern UI that works on all devices
- **Usage Analytics** - Track bandwidth, time, and session statistics

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vpn-pwa/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the frontend directory:
   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`

## 🏗️ Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## 📱 PWA Features

The app is configured as a Progressive Web App with:

- **Installable** - Add to home screen on mobile/desktop
- **Offline Support** - Basic caching for core functionality
- **Push Notifications** - Ready for future implementation
- **Auto-updates** - Service worker handles app updates

### Installing the PWA

1. Open the app in a supported browser
2. Look for the "Install" button in the address bar
3. Follow the browser prompts to install

## 🎨 Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Supabase** - Backend and authentication
- **React Router** - Client-side routing
- **React Hot Toast** - Notifications
- **Lucide React** - Icon library
- **Zustand** - State management (planned)

## 📂 Project Structure

```
frontend/
├── public/                 # Static assets and PWA manifest
│   ├── icons/             # PWA icons
│   ├── manifest.json      # PWA manifest
│   └── sw.js             # Service worker
├── src/
│   ├── components/        # React components
│   │   ├── Auth/         # Authentication components
│   │   ├── Dashboard/    # Main app interface
│   │   └── ui/           # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and configuration
│   ├── styles/           # Global styles
│   ├── App.tsx           # Main app component
│   └── main.tsx          # App entry point
├── package.json
├── vite.config.ts        # Vite configuration
└── tailwind.config.js    # Tailwind configuration
```

## 🔧 Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run the migration files from `../supabase/migrations/`
3. Get your project URL and anon key from Settings > API
4. Add them to your `.env.local` file

### Stripe Setup (Optional)

1. Create a Stripe account
2. Get your publishable key from the dashboard
3. Add it to your `.env.local` file

## 🚦 Usage

### Authentication

1. Open the app
2. Register a new account or sign in
3. Check your email for verification (if required)

### Proxy Sessions

1. Navigate to "Proxy Control" in the dashboard
2. Enter a target URL (e.g., `example.com`)
3. Click "Start Proxy Session"
4. Use the generated proxy URL to browse anonymously
5. Monitor usage in real-time
6. Terminate the session when done

### Monitoring

- View usage statistics in the "Statistics" tab
- Track bandwidth, session time, and request counts
- Monitor account balance and session limits

## 🔒 Security Features

- **Row Level Security** - Database access control via Supabase
- **JWT Authentication** - Secure token-based auth
- **Input Validation** - Client and server-side validation
- **HTTPS Only** - All connections are encrypted
- **Content Security Policy** - XSS protection

## 🎯 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting (recommended)
- Conventional component structure

### Adding New Features

1. Create components in appropriate directories
2. Use TypeScript for all new code
3. Follow the established component patterns
4. Add proper error handling
5. Update this README if needed

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Other Platforms

The built files are static and can be deployed to:
- Netlify
- Firebase Hosting
- AWS S3 + CloudFront
- Any static hosting service

## 🐛 Troubleshooting

### Common Issues

1. **Build Errors**: Ensure all environment variables are set
2. **Auth Issues**: Check Supabase URL and keys
3. **PWA Not Installing**: Check manifest.json and HTTPS
4. **Styling Issues**: Verify Tailwind CSS is properly configured

### Getting Help

1. Check the browser console for errors
2. Verify environment variables are correct
3. Ensure Supabase migrations are applied
4. Check network connectivity

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review Supabase documentation
- Open an issue in the repository 