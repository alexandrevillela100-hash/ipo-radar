import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Radar,
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  File,
} from "lucide-react";
import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function AdminFilings() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ companyId: string }>();
  const companyId = parseInt(params.companyId || "0", 10);
  const utils = trpc.useUtils();

  const { data: companies } = trpc.company.list.useQuery();
  const company = companies?.find((c: any) => c.id === companyId);

  const { data: filings, isLoading } = trpc.filing.listByCompany.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );

  const uploadMutation = trpc.filing.upload.useMutation({
    onSuccess: (result) => {
      utils.filing.listByCompany.invalidate({ companyId });
      if (result.status === "ready") {
        toast.success(`Filing processed: ${result.chunkCount} chunks created`);
      } else {
        toast.error("Filing upload failed during processing");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.filing.delete.useMutation({
    onSuccess: () => {
      utils.filing.listByCompany.invalidate({ companyId });
      toast.success("Filing deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader />
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
          <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <div className="container py-6">
        <Link href="/admin/companies">
          <Button variant="ghost" size="sm" className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Button>
        </Link>

        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">
            SEC Filings — {company?.name || `Company #${companyId}`}
          </h2>
          <p className="text-muted-foreground mt-1">
            Upload S-1, prospectus, and other SEC filings. Text content will be
            extracted, chunked, and indexed for the AI chat.
          </p>
        </div>

        {/* Upload Section */}
        <Card className="bg-card/50 border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Filing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FilingUploader
              companyId={companyId}
              onUpload={(data) => uploadMutation.mutate(data)}
              isUploading={uploadMutation.isPending}
            />
          </CardContent>
        </Card>

        {/* Filings List */}
        <h3 className="text-lg font-semibold mb-4">Uploaded Filings</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : !filings || filings.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/50 rounded-lg">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No filings uploaded yet. Upload an S-1 or prospectus to enable the
              AI chat.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filings.map((f: any) => (
              <Card key={f.id} className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                        <File className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{f.documentName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {f.documentType}
                          </span>
                          {f.chunkCount && (
                            <span className="text-xs text-muted-foreground">
                              · {f.chunkCount} chunks
                            </span>
                          )}
                          {f.fileSize && (
                            <span className="text-xs text-muted-foreground">
                              · {(f.fileSize / 1024).toFixed(0)} KB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <FilingStatusBadge status={f.status} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete "${f.documentName}"?`)) {
                            deleteMutation.mutate({ id: f.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {f.errorMessage && (
                    <p className="text-xs text-destructive mt-2 ml-13">
                      {f.errorMessage}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilingUploader({
  companyId,
  onUpload,
  isUploading,
}: {
  companyId: number;
  onUpload: (data: any) => void;
  isUploading: boolean;
}) {
  const [docType, setDocType] = useState("S-1");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;

    // Read file as base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] || "";
      onUpload({
        companyId,
        documentType: docType,
        documentName: file.name,
        content: base64,
        contentType: file.type || "text/plain",
      });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Document Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="S-1">S-1</SelectItem>
              <SelectItem value="S-1/A">S-1/A (Amendment)</SelectItem>
              <SelectItem value="Prospectus">Prospectus</SelectItem>
              <SelectItem value="424B4">424B4 (Final Prospectus)</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">File (.txt or .html)</Label>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".txt,.html,.htm,.text"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="cursor-pointer"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Upload the text or HTML version of SEC filings. You can download text
        versions from EDGAR. PDF files are not supported — please convert to
        text first.
      </p>
      <Button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="gap-2"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload & Process
          </>
        )}
      </Button>
    </div>
  );
}

function FilingStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ready":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-[oklch(0.7_0.15_160)] bg-[oklch(0.7_0.15_160)]/10 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="h-3 w-3" />
          Ready
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-[oklch(0.75_0.12_80)] bg-[oklch(0.75_0.12_80)]/10 px-2 py-0.5 rounded-full">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
          <AlertCircle className="h-3 w-3" />
          Error
        </span>
      );
    default:
      return (
        <span className="text-xs text-muted-foreground">{status}</span>
      );
  }
}

function AdminHeader() {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center h-16">
        <Link href="/">
          <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radar className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">IPO Radar</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Admin
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
