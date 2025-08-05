import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Clock, GitBranch, User } from "lucide-react";
import type { Invoice, InvoiceRevisionHistory } from "@shared/schema";

interface InvoiceRevisionModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceRevisionModal({ invoice, isOpen, onClose }: InvoiceRevisionModalProps) {
  const [revisionReason, setRevisionReason] = useState("");
  const [showCreateRevision, setShowCreateRevision] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch revision history
  const { data: revisionHistory = [] } = useQuery<InvoiceRevisionHistory[]>({
    queryKey: ["/api/invoices", invoice?.id, "revisions"],
    enabled: !!invoice?.id && isOpen,
  });

  // Fetch all versions of this invoice
  const { data: allVersions = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices", invoice?.id, "versions"],
    enabled: !!invoice?.id && isOpen,
  });

  // Create revision mutation
  const createRevisionMutation = useMutation({
    mutationFn: async (data: { revisionReason: string }) => {
      const response = await apiRequest(`/api/invoices/${invoice?.id}/revise`, "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoice?.id, "revisions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoice?.id, "versions"] });
      setRevisionReason("");
      setShowCreateRevision(false);
      toast({
        title: "Success",
        description: "Invoice revision created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invoice revision",
        variant: "destructive",
      });
    },
  });

  const handleCreateRevision = () => {
    if (!revisionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the revision",
        variant: "destructive",
      });
      return;
    }
    createRevisionMutation.mutate({ revisionReason });
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onRequestClose={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="modal-invoice-revision">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Invoice Revision History - {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Invoice Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Current Version</h3>
              <Badge variant={invoice.isCurrentVersion ? "default" : "secondary"}>
                {invoice.isCurrentVersion ? "Current" : `v${invoice.revisionNumber}`}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Revision Number</Label>
                <p className="font-medium">{invoice.revisionNumber}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Amount</Label>
                <p className="font-medium">MYR {parseFloat(invoice.totalAmount).toFixed(2)}</p>
              </div>
              {invoice.revisionReason && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Revision Reason</Label>
                  <p className="font-medium">{invoice.revisionReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Create New Revision */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Create New Revision</h3>
              <Button
                onClick={() => setShowCreateRevision(!showCreateRevision)}
                variant="outline"
                size="sm"
                data-testid="button-toggle-create-revision"
              >
                {showCreateRevision ? "Cancel" : "Create Revision"}
              </Button>
            </div>

            {showCreateRevision && (
              <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                <div>
                  <Label htmlFor="revision-reason">Reason for Revision</Label>
                  <Textarea
                    id="revision-reason"
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    placeholder="Explain why this revision is being created..."
                    className="mt-1"
                    data-testid="textarea-revision-reason"
                  />
                </div>
                <Button
                  onClick={handleCreateRevision}
                  disabled={createRevisionMutation.isPending || !revisionReason.trim()}
                  data-testid="button-create-revision"
                >
                  {createRevisionMutation.isPending ? "Creating..." : "Create Revision"}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* All Versions */}
          {allVersions.length > 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">All Versions</h3>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {allVersions
                    .sort((a, b) => b.revisionNumber - a.revisionNumber)
                    .map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant={version.isCurrentVersion ? "default" : "secondary"}>
                            v{version.revisionNumber}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{version.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              MYR {parseFloat(version.totalAmount).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{format(new Date(version.createdAt), "MMM d, yyyy")}</p>
                          <p>{format(new Date(version.createdAt), "h:mm a")}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Revision History */}
          <div className="space-y-4">
            <h3 className="font-semibold">Change History</h3>
            {revisionHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No revision history available</p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-4">
                  {revisionHistory.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-muted pl-4 pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {entry.changeType}
                          </Badge>
                          <span className="text-sm font-medium">v{entry.revisionNumber}</span>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <p>{format(new Date(entry.createdAt), "MMM d, yyyy")}</p>
                          <p>{format(new Date(entry.createdAt), "h:mm a")}</p>
                        </div>
                      </div>
                      {entry.changeDescription && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {entry.changeDescription}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>User ID: {entry.userId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline" data-testid="button-close-revision-modal">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}