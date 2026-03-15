import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { api } from "../services/api";
import { storage, AUTH_KEYS, APP_KEYS } from "../services/storage";

type AuthProps = {
  onLogin: (isGuest?: boolean) => void;
  initialStep?: "splash" | "onboarding" | "login" | "register" | "forgot";
};

export default function AuthFlow({ onLogin, initialStep = "splash" }: AuthProps) {
  const [step, setStep] = useState<
    "splash" | "onboarding" | "login" | "register" | "forgot"
  >(initialStep);

  useEffect(() => {
    if (step === "splash") {
      const timer = setTimeout(async () => {
        await storage.set(APP_KEYS.ONBOARDING_DONE, "true");
        setStep("onboarding");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  if (step === "splash") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-primary text-white">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-accent rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <span className="text-4xl font-game font-bold text-primary">
              ML
            </span>
          </div>
          <h1 className="text-4xl font-game font-bold tracking-wider mb-2">
            ML WIKI
          </h1>
          <p className="text-secondary text-sm">
            Your Ultimate Mobile Legends Companion
          </p>
        </motion.div>
        <div className="absolute bottom-10 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-secondary border-t-accent rounded-full animate-spin mb-4"></div>
          <span className="text-xs text-secondary/70">v1.0.0</span>
        </div>
      </div>
    );
  }

  if (step === "onboarding") {
    return (
      <Onboarding
        onComplete={() => setStep("login")}
        onGuest={() => onLogin(true)}
      />
    );
  }

  if (step === "login") {
    return (
      <Login
        onLogin={() => onLogin(false)}
        onRegister={() => setStep("register")}
        onForgot={() => setStep("forgot")}
        onGuest={() => onLogin(true)}
      />
    );
  }

  if (step === "register") {
    return (
      <Register
        onBack={() => setStep("login")}
        onComplete={() => setStep("login")}
      />
    );
  }

  if (step === "forgot") {
    return <ForgotPassword onBack={() => setStep("login")} />;
  }

  return null;
}

function Onboarding({
  onComplete,
  onGuest,
}: {
  onComplete: () => void;
  onGuest: () => void;
}) {
  const [slide, setSlide] = useState(0);
  const slides = [
    {
      title: "Explore Every Hero",
      desc: "Full skill breakdowns, skins, and builds at your fingertips.",
      icon: "⚔️",
    },
    {
      title: "Join the Community",
      desc: "Share strategies, tips, and team up with players worldwide.",
      icon: "🌍",
    },
    {
      title: "Chat in Real Time",
      desc: "Talk with players globally or privately with friends.",
      icon: "💬",
    },
    {
      title: "Ready to Play Smarter?",
      desc: "Join thousands of players today.",
      icon: "🚀",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="text-8xl mb-8">{slides[slide].icon}</div>
            <h2 className="text-3xl font-game font-bold mb-4 text-primary dark:text-accent">
              {slides[slide].title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {slides[slide].desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 flex flex-col items-center">
        <div className="flex space-x-2 mb-8">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${i === slide ? "w-8 bg-primary dark:bg-accent" : "w-2 bg-gray-300 dark:bg-gray-700"}`}
            />
          ))}
        </div>

        {slide < slides.length - 1 ? (
          <div className="w-full flex justify-between items-center">
            <button
              onClick={() => setSlide(slides.length - 1)}
              className="text-gray-500 font-medium px-4 py-2"
            >
              Skip
            </button>
            <button
              onClick={() => setSlide((s) => s + 1)}
              className="bg-primary text-white px-6 py-3 rounded-xl font-medium flex items-center"
            >
              Next <ChevronRight size={20} className="ml-1" />
            </button>
          </div>
        ) : (
          <div className="w-full space-y-3">
            <button
              onClick={onComplete}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold shadow-md"
            >
              Create Account
            </button>
            <button
              onClick={onComplete}
              className="w-full border-2 border-primary text-primary dark:border-accent dark:text-accent py-3.5 rounded-xl font-semibold"
            >
              Log In
            </button>
            <button
              onClick={onGuest}
              className="w-full py-3 text-gray-500 font-medium"
            >
              Continue as Guest
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Login({ onLogin, onRegister, onForgot, onGuest }: any) {
  const [showPwd, setShowPwd] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Backend supports login via username or email
      const reqData = identifier.includes("@") 
        ? { email: identifier, password } 
        : { username: identifier, password };
        
      const response = await api.post("/auth/login", reqData);
      const { accessToken, refreshToken, user } = response.data.data;
      
      // Save tokens and user data
      await storage.set(AUTH_KEYS.ACCESS_TOKEN, accessToken);
      await storage.set(AUTH_KEYS.REFRESH_TOKEN, refreshToken);
      await storage.set(AUTH_KEYS.USER_DATA, JSON.stringify(user));
      
      onLogin(false); // trigger actual login
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 bg-bg-light dark:bg-bg-dark overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary text-white rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg">
            <span className="text-2xl font-game font-bold">ML</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome Back
          </h1>
          <p className="text-gray-500 mt-2">Log in to your ML Wiki account</p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          
          <div>
            <div className="relative">
              <User
                className="absolute left-4 top-3.5 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Username or Email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Lock
                className="absolute left-4 top-3.5 text-gray-400"
                size={20}
              />
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
              />
              <button
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-4 top-3.5 text-gray-400"
              >
                {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <label className="flex items-center text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                className="mr-2 rounded text-primary focus:ring-primary"
              />
              Remember Me
            </label>
            <button
               onClick={onForgot}
              className="text-primary dark:text-accent font-medium"
            >
              Forgot password?
            </button>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full text-white py-3.5 rounded-xl font-semibold shadow-md mt-6 ${loading ? 'bg-primary/70' : 'bg-primary'}`}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
            <span className="px-4 text-gray-400 text-sm">OR</span>
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          <div className="space-y-3">
            <button className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium flex items-center justify-center">
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="w-5 h-5 mr-2"
                alt="Google"
              />
              Continue with Google
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-600 dark:text-gray-400">
          Don't have an account?{" "}
          <button
            onClick={onRegister}
            className="text-primary dark:text-accent font-semibold"
          >
            Sign Up
          </button>
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={onGuest}
            className="text-gray-500 text-sm font-medium"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

function Register({ onBack, onComplete }: any) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post("/auth/register", { username, email, password });
      
      // Auto-login after registration is actually better UX, or we just go back to login 
      onComplete(); // we'll assume it just redirects to login successfully
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        // Validation errors array
        setError(err.response.data.errors.map((e: any) => e.message).join(", "));
      } else {
        setError("Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 bg-bg-light dark:bg-bg-dark overflow-y-auto">
      <button
        onClick={onBack}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm mb-6"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="flex-1 max-w-md w-full mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Create Account
        </h1>
        <p className="text-gray-500 mb-8">Join the ultimate ML community</p>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="relative">
            <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
            />
          </div>

          <label className="flex items-start mt-6 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              className="mt-1 mr-3 rounded text-primary focus:ring-primary"
            />
            <span>
              I agree to the{" "}
              <a href="#" className="text-primary dark:text-accent">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-primary dark:text-accent">
                Privacy Policy
              </a>
            </span>
          </label>

          <button
            onClick={handleRegister}
            disabled={loading}
            className={`w-full text-white py-3.5 rounded-xl font-semibold shadow-md mt-6 ${loading ? 'bg-primary/70' : 'bg-primary'}`}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ForgotPassword({ onBack }: any) {
  return (
    <div className="flex flex-col h-full p-6 bg-bg-light dark:bg-bg-dark">
      <button
        onClick={onBack}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm mb-6"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="flex-1 max-w-md w-full mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Reset Password
        </h1>
        <p className="text-gray-500 mb-8">
          Enter your email and we'll send you a reset link.
        </p>

        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input
              type="email"
              placeholder="Email Address"
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
            />
          </div>
          <button
            onClick={onBack}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold shadow-md mt-4"
          >
            Send Reset Link
          </button>
        </div>
      </div>
    </div>
  );
}
