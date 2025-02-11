"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Heart, Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";

interface Design {
  id: string;
  image_url: string;
  prompt: string;
  likes_count: number;
  creator_id: string;
  category: string;
  created_at: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;
  const { user } = useAuth();

  useEffect(() => {
    loadDesigns();
  }, [selectedCategory, sortBy, page]);

  async function loadDesigns() {
    try {
      let query = supabase
        .from("designs")
        .select("*", { count: "exact" })
        .eq("status", "marketplace");

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      switch (sortBy) {
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
        case "most_liked":
          query = query.order("likes_count", { ascending: false });
          break;
        case "newest":
        default:
          query = query.order("created_at", { ascending: false });
      }

      query = query
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      const { data, count } = await query;

      if (count) {
        setTotalPages(Math.ceil(count / itemsPerPage));
      }
      setDesigns(data || []);
    } catch (error: any) {
      toast.error("Error loading designs");
    } finally {
      setLoading(false);
    }
  }

  const handleLike = async (designId: string) => {
    if (!user) {
      toast.error("Please log in to like designs");
      return;
    }

    try {
      const { error } = await supabase
        .from("likes")
        .insert([{ design_id: designId, user_id: user.id }]);

      if (error) throw error;

      setDesigns(designs.map(design => 
        design.id === designId 
          ? { ...design, likes_count: (design.likes_count || 0) + 1 }
          : design
      ));

      toast.success("Design liked!");
    } catch (error: any) {
      toast.error("Error liking design");
    }
  };

  const filteredDesigns = designs.filter(design =>
    design.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    design.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-8">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold">Marketplace</h1>
            
            <div className="flex flex-col md:flex-row w-full md:w-auto gap-4">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search designs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[140px]">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="abstract">Abstract</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="pattern">Pattern</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="most_liked">Most Liked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {filteredDesigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No designs found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDesigns.map((design) => (
                <Card key={design.id} className="overflow-hidden group">
                  <CardHeader className="p-0">
                    <div 
                      className="cursor-pointer relative"
                      onClick={() => router.push(`/marketplace/${design.id}`)}
                    >
                      <img
                        src={design.image_url}
                        alt={design.prompt}
                        className="w-full aspect-square object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-medium">View Details</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm line-clamp-2">{design.prompt}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Category: {design.category}
                    </p>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(design.id)}
                    >
                      <Heart className="h-4 w-4 mr-1" />
                      {design.likes_count || 0}
                    </Button>
                    <Button size="sm">
                      Purchase
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}