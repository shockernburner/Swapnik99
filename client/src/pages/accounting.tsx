import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Calendar, Filter, FolderOpen } from "lucide-react";
import { format } from "date-fns";

interface AccountingDoc {
  id: number;
  title: string;
  category: string;
  year: number;
  fileUrl: string;
  fileType?: string;
  createdAt: string;
}

export default function AccountingPage() {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: documents, isLoading } = useQuery<AccountingDoc[]>({
    queryKey: ["/api/accounting"],
  });

  const years = [...new Set(documents?.map((d) => d.year))].sort((a, b) => b - a);
  const categories = [...new Set(documents?.map((d) => d.category))];

  const filteredDocs = documents?.filter((doc) => {
    const yearMatch = selectedYear === "all" || doc.year.toString() === selectedYear;
    const categoryMatch = selectedCategory === "all" || doc.category === selectedCategory;
    return yearMatch && categoryMatch;
  });

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "budget":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "ledger":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "journal":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "report":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (fileType?.includes("pdf")) return "PDF";
    if (fileType?.includes("excel") || fileType?.includes("spreadsheet")) return "XLS";
    return "DOC";
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accounting & Transparency</h1>
        <p className="text-muted-foreground">Financial records and reports for complete transparency</p>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by:</span>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32" data-testid="select-year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-36" data-testid="select-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded bg-muted" />
                <div className="flex-1">
                  <div className="h-5 bg-muted rounded w-48 mb-2" />
                  <div className="h-4 bg-muted rounded w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDocs && filteredDocs.length > 0 ? (
        <div className="space-y-3">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="hover-elevate transition-all" data-testid={`document-${doc.id}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{getFileIcon(doc.fileType)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{doc.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className={getCategoryColor(doc.category)}>
                      {doc.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {doc.year}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Uploaded {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild data-testid={`button-download-${doc.id}`}>
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1" />
                    View
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {documents?.length === 0 ? "No documents yet" : "No matching documents"}
            </h3>
            <p className="text-muted-foreground">
              {documents?.length === 0
                ? "Financial documents will be uploaded by administrators"
                : "Try adjusting your filters"}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            About Our Transparency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            All financial documents, including budgets, ledgers, journals, and reports, are made available 
            here for complete transparency. These documents are uploaded by administrators and are 
            organized by year and category for easy access. If you have any questions about our finances, 
            please reach out to the admin team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
