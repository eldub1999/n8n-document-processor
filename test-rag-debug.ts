// Debug script to test RAG search functionality
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function testRAGSearch() {
  console.log('🔍 Testing RAG search functionality...');
  
  const supabase = createClient(
    'https://weewihugifrttuibusjf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZXdpaHVnaWZydHR1aWJ1c2pmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzQyMjQ5NSwiZXhwIjoyMDYyOTk4NDk1fQ.YWJ-EvM-2XKC9zrX7jBqWJMxQCGOJOyoBAf8QNMCZ-A'
  );

  try {
    // Test 1: Get API key
    console.log('1. Testing API key retrieval...');
    const { data: apiKey, error: keyError } = await supabase.rpc('get_api_key', { key_name: 'voyage_ai_api_key' });
    if (keyError) throw new Error(`API key error: ${keyError.message}`);
    console.log('✅ API key retrieved successfully');

    // Test 2: Generate embeddings
    console.log('2. Testing embedding generation...');
    const query = "What are the escrow rates in Arizona?";
    
    const embeddingResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: [query],
        model: 'voyage-3-large'
      })
    });
    
    if (!embeddingResponse.ok) {
      throw new Error(`Voyage AI embedding failed: ${embeddingResponse.status}`);
    }
    
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;
    console.log('✅ Embedding generated successfully');

    // Test 3: Vector search
    console.log('3. Testing vector search...');
    const { data: searchResults, error: searchError } = await supabase.rpc('search_similar_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5
    });
    
    if (searchError) {
      console.error('❌ Vector search error:', searchError);
      throw new Error(`Vector search failed: ${searchError.message}`);
    }
    
    console.log(`✅ Vector search completed. Found ${searchResults?.length || 0} results`);
    console.log('Search results:', searchResults);

    // Test 4: Lower threshold search if no results
    if (!searchResults || searchResults.length === 0) {
      console.log('4. Testing with lower threshold...');
      const { data: lowerResults, error: lowerError } = await supabase.rpc('search_similar_embeddings', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 10
      });
      
      if (lowerError) {
        console.error('❌ Lower threshold search error:', lowerError);
      } else {
        console.log(`✅ Lower threshold search found ${lowerResults?.length || 0} results`);
        console.log('Lower threshold results:', lowerResults);
      }
    }

    console.log('🎉 Debug test completed successfully!');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

// Run the test if this is the main module
if (import.meta.main) {
  testRAGSearch();
} 