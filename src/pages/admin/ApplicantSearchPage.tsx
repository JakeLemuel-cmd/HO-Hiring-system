import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/common/Misc";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { searchApplicants } from "@/services/applicant.service";
import type { ApplicantDocument } from "@/types";

export function ApplicantSearchPage() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ApplicantDocument[]>([]);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim()) return;
    const found = await searchApplicants(term.trim());
    setResults(found);
    setSearched(true);
  }

  return (
    <div>
      <PageHeader title="Applicant Search" description="Search applicants by name, email, or reference number." />

      <form onSubmit={onSearch} className="mb-6 flex gap-2">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by name or email"
          className="max-w-md"
        />
        <Button type="submit">
          <Search className="h-4 w-4" /> Search
        </Button>
      </form>

      {searched && results.length === 0 && (
        <EmptyState title="No applicants found" description="Try a different name, email, or reference number." />
      )}

      {results.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Reference No.</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-foreground">{a.firstName} {a.lastName}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>{a.applicantReferenceNumber ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate(`/admin/applicants/${a.id}`)}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
