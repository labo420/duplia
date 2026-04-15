import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, Trash2, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const ADMIN_API_BASE = "/api/admin/products";

interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  affiliateLink: string;
  category: string;
  type: string;
  matchId: number;
  matchScore: number;
  formato: number | null;
  unitaMisura: string | null;
  pricePerUnit: number | null;
}

type FormData = {
  name: string;
  brand: string;
  price: string;
  imageUrl: string;
  affiliateLink: string;
  category: string;
  type: string;
  matchId: string;
  matchScore: string;
  formato: string;
  unitaMisura: string;
};

const EMPTY_FORM: FormData = {
  name: "",
  brand: "",
  price: "",
  imageUrl: "",
  affiliateLink: "",
  category: "Makeup",
  type: "Dupe",
  matchId: "",
  matchScore: "90",
  formato: "",
  unitaMisura: "ml",
};

// ------- Password Gate -------
function PasswordGate({ onAuth }: { onAuth: (pwd: string) => void }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const verify = async () => {
    const res = await fetch(ADMIN_API_BASE, {
      headers: { "x-admin-password": pwd },
    });
    if (res.ok) {
      sessionStorage.setItem("duplia-admin-pwd", pwd);
      onAuth(pwd);
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center mx-auto mb-6">
            <Lock className="w-5 h-5 text-background" />
          </div>
          <h1 className="text-2xl font-serif font-bold">Accesso Admin</h1>
          <p className="text-muted-foreground text-sm mt-2">Inserisci la password per continuare</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-4">
          <div className="relative">
            <Input
              type={showPwd ? "text" : "password"}
              placeholder="Password admin..."
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setError(false); }}
              className={`h-12 rounded-xl pr-10 ${error ? "border-destructive" : ""}`}
              data-testid="input-admin-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-sm text-destructive text-center">Password errata. Riprova.</p>}

          <Button
            type="submit"
            className="w-full h-12 rounded-xl font-semibold"
            data-testid="button-admin-login"
          >
            Accedi
          </Button>
        </form>
      </div>
    </div>
  );
}

// ------- Admin Dashboard -------
function AdminDashboard({ password }: { password: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const headers = { "Content-Type": "application/json", "x-admin-password": password };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(ADMIN_API_BASE, { headers: { "x-admin-password": password } });
      if (res.ok) setProducts(await res.json());
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const showMsg = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        name: form.name,
        brand: form.brand,
        price: parseFloat(form.price),
        imageUrl: form.imageUrl,
        affiliateLink: form.affiliateLink,
        category: form.category,
        type: form.type,
        matchId: parseInt(form.matchId, 10),
        matchScore: parseInt(form.matchScore, 10),
        formato: form.formato ? parseFloat(form.formato) : null,
        unitaMisura: form.unitaMisura || null,
      };
      const res = await fetch(ADMIN_API_BASE, { method: "POST", headers, body: JSON.stringify(body) });
      if (res.ok) {
        setForm(EMPTY_FORM);
        await fetchProducts();
        showMsg("Prodotto aggiunto con successo.", "success");
      } else {
        const err = await res.json();
        showMsg(err.error || "Errore durante il salvataggio.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteId(id);
    try {
      const res = await fetch(`${ADMIN_API_BASE}/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showMsg("Prodotto eliminato.", "success");
      } else {
        showMsg("Errore durante l'eliminazione.", "error");
      }
    } finally {
      setDeleteId(null);
    }
  };

  const field = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 pb-24">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Torna al sito
      </Link>

      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-serif font-bold">Pannello Admin</h1>
          <p className="text-muted-foreground mt-1">Gestisci i prodotti del database</p>
        </div>
        <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {products.length} prodotti
        </span>
      </div>

      {/* Toast message */}
      {message && (
        <div
          className={`mb-6 px-5 py-3 rounded-2xl text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-destructive border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add product form */}
      <div className="rounded-3xl border border-border/60 shadow-sm p-6 md:p-8 mb-12 bg-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center">
            <Plus className="w-4 h-4 text-background" />
          </div>
          <h2 className="text-xl font-serif font-bold">Aggiungi Prodotto</h2>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome *</Label>
              <Input value={form.name} onChange={(e) => field("name", e.target.value)} required placeholder="Hollywood Flawless Filter" className="rounded-xl" data-testid="input-product-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand *</Label>
              <Input value={form.brand} onChange={(e) => field("brand", e.target.value)} required placeholder="Charlotte Tilbury" className="rounded-xl" data-testid="input-product-brand" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prezzo (€) *</Label>
              <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => field("price", e.target.value)} required placeholder="46.00" className="rounded-xl" data-testid="input-product-price" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formato</Label>
              <Input type="number" step="0.1" min="0" value={form.formato} onChange={(e) => field("formato", e.target.value)} placeholder="30" className="rounded-xl" data-testid="input-product-formato" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unità di Misura</Label>
              <select
                value={form.unitaMisura}
                onChange={(e) => field("unitaMisura", e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="select-unita-misura"
              >
                <option value="ml">ml</option>
                <option value="g">g</option>
                <option value="oz">oz</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria *</Label>
              <select
                value={form.category}
                onChange={(e) => field("category", e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="select-category"
              >
                <option value="Makeup">Makeup</option>
                <option value="Skincare">Skincare</option>
                <option value="Profumi">Profumi</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo *</Label>
              <select
                value={form.type}
                onChange={(e) => field("type", e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="select-type"
              >
                <option value="Luxury">Luxury</option>
                <option value="Dupe">Dupe</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Match ID *</Label>
              <Input type="number" min="1" value={form.matchId} onChange={(e) => field("matchId", e.target.value)} required placeholder="4" className="rounded-xl" data-testid="input-match-id" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Match Score</Label>
              <Input type="number" min="1" max="100" value={form.matchScore} onChange={(e) => field("matchScore", e.target.value)} placeholder="90" className="rounded-xl" data-testid="input-match-score" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Immagine URL *</Label>
              <Input value={form.imageUrl} onChange={(e) => field("imageUrl", e.target.value)} required placeholder="https://images.unsplash.com/..." className="rounded-xl" data-testid="input-image-url" />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Link Affiliato *</Label>
              <Input value={form.affiliateLink} onChange={(e) => field("affiliateLink", e.target.value)} required placeholder="https://..." className="rounded-xl" data-testid="input-affiliate-link" />
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={submitting} className="h-11 px-8 rounded-xl font-semibold" data-testid="button-create-product">
              {submitting ? "Salvataggio..." : "Aggiungi Prodotto"}
            </Button>
          </div>
        </form>
      </div>

      {/* Products table */}
      <div>
        <h2 className="text-xl font-serif font-bold mb-6">Tutti i Prodotti</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        ) : (
          <div className="rounded-3xl border border-border/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/40">
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">ID</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nome</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Brand</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cat.</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tipo</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Prezzo</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Formato</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Match</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`border-b border-border/30 last:border-0 transition-colors ${i % 2 === 0 ? "bg-card" : "bg-muted/20"} hover:bg-muted/40`}
                      data-testid={`row-product-${p.id}`}
                    >
                      <td className="px-5 py-3.5 text-muted-foreground tabular-nums">{p.id}</td>
                      <td className="px-5 py-3.5 font-serif font-medium max-w-[160px] truncate">{p.name}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{p.brand}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{p.category}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.type === "Luxury" ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground"}`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">€{p.price.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {p.formato ? `${p.formato} ${p.unitaMisura}` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground tabular-nums">#{p.matchId}</td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleteId === p.id}
                          className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors disabled:opacity-40"
                          data-testid={`button-delete-${p.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length === 0 && (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  Nessun prodotto nel database.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------- Main export -------
export default function Admin() {
  const [password, setPassword] = useState<string | null>(
    () => sessionStorage.getItem("duplia-admin-pwd")
  );

  if (!password) {
    return <PasswordGate onAuth={setPassword} />;
  }

  return <AdminDashboard password={password} />;
}
