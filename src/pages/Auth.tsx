import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { RegionProvider } from "@/contexts/RegionContext";
import Navbar from "@/components/Navbar";

const AuthInner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signup");

  // Bug #1 fix: Simply redirect to home after login — no auto-checkout
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent, isLogin: boolean) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Connexion réussie !");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Compte créé ! Vous êtes connecté.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error("Connexion Google temporairement indisponible");
      }
    } catch {
      toast.error("Connexion Google temporairement indisponible");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Bug #24: Navbar with region toggle on auth page */}
      <Navbar />
      <div className="flex items-center justify-center px-6 pt-24 pb-12">
        <div className="max-w-md w-full space-y-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à ScoreCV
          </button>

          <div className="bg-card p-8 rounded-3xl shadow-soft">
            {/* Bug #21: Use controlled tab state instead of DOM querySelector */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full mb-6 bg-secondary rounded-xl p-1">
                <TabsTrigger value="signup" className="flex-1 rounded-lg py-2.5 text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Créer un compte
                </TabsTrigger>
                <TabsTrigger value="login" className="flex-1 rounded-lg py-2.5 text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Se connecter
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signup" className="space-y-4">
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-foreground">Créer un compte gratuit</h1>
                  <p className="text-sm text-muted-foreground mt-1">Sauvegardez vos analyses et accédez à vos rapports</p>
                </div>
                <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-4 py-7 px-6 bg-background border-2 border-border rounded-xl font-bold text-lg text-foreground hover:bg-secondary/50 transition-all">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuer avec Google
                </button>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">ou</span></div>
                </div>
                <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" required className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-foreground">Mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50">
                    {loading ? "Chargement..." : "Créer mon compte"}
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="login" className="space-y-4">
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-foreground">Connexion</h1>
                  <p className="text-sm text-muted-foreground mt-1">Retrouvez vos rapports et analyses</p>
                </div>
                <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-4 py-7 px-6 bg-background border-2 border-border rounded-xl font-bold text-lg text-foreground hover:bg-secondary/50 transition-all">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuer avec Google
                </button>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">ou</span></div>
                </div>
                <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" required className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-foreground">Mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50">
                    {loading ? "Chargement..." : "Se connecter"}
                  </button>
                </form>
                <p className="text-center text-sm text-muted-foreground pt-2">
                  Pas encore de compte ?{" "}
                  <button
                    onClick={() => setActiveTab("signup")}
                    className="text-primary font-semibold hover:underline"
                  >
                    Créer mon compte gratuit →
                  </button>
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

const Auth = () => (
  <RegionProvider>
    <AuthInner />
  </RegionProvider>
);

export default Auth;
