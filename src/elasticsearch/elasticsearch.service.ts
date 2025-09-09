
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch';


export interface RecipeDocument {
  id: string;
  title: string;
  description?: string;
  cuisine?: string;
  difficulty: number;
  cookTime: number;
  servings: number;
  authorId: string;
  authorUsername: string;
  ingredients: {
    name: string;
    quantity: string;
    unit?: string;
  }[];
  averageRating: number;
  ratingsCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private readonly indexName = 'recipes';

  constructor(private readonly elasticsearchService: NestElasticsearchService) {}

  async onModuleInit() {
    await this.createIndex();
  }

  private async createIndex() {
    try {
      const indexExists = await this.elasticsearchService.indices.exists({
        index: this.indexName,
      });

      if (!indexExists) {
        await this.elasticsearchService.indices.create({
          index: this.indexName,
          body: {
            settings: {
              analysis: {
                analyzer: {
                  recipe_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'stop', 'snowball'],
                  },
                },
              },
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: {
                  type: 'text',
                  analyzer: 'recipe_analyzer',
                  fields: {
                    keyword: { type: 'keyword' },
                    suggest: {
                      type: 'completion',
                    },
                  },
                },
                description: {
                  type: 'text',
                  analyzer: 'recipe_analyzer',
                },
                cuisine: {
                  type: 'keyword',
                  fields: {
                    text: { type: 'text' },
                  },
                },
                difficulty: { type: 'integer' },
                cookTime: { type: 'integer' },
                servings: { type: 'integer' },
                authorId: { type: 'keyword' },
                authorUsername: {
                  type: 'keyword',
                  fields: {
                    text: { type: 'text' },
                  },
                },
                ingredients: {
                  type: 'nested',
                  properties: {
                    name: {
                      type: 'text',
                      analyzer: 'recipe_analyzer',
                      fields: {
                        keyword: { type: 'keyword' },
                        suggest: {
                          type: 'completion',
                        },
                      },
                    },
                    quantity: { type: 'text' },
                    unit: { type: 'keyword' },
                  },
                },
                averageRating: { type: 'float' },
                ratingsCount: { type: 'integer' },
                commentsCount: { type: 'integer' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
              },
            },
          },
        } as any);
        this.logger.log('Recipes index created');
      }
    } catch (error) {
      this.logger.error('Failed to create index', error);
    }
  }

  async indexRecipe(recipe: RecipeDocument) {
    try {
      await this.elasticsearchService.index({
        index: this.indexName,
        id: recipe.id,
        document: recipe,
      });
      this.logger.log(`Recipe ${recipe.id} indexed successfully`);
    } catch (error) {
      this.logger.error(`Failed to index recipe ${recipe.id}`, error);
      throw error;
    }
  }

  async updateRecipe(recipeId: string, recipe: Partial<RecipeDocument>) {
    try {
      await this.elasticsearchService.update({
        index: this.indexName,
        id: recipeId,
        doc: recipe,
      });
      this.logger.log(`Recipe ${recipeId} updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to update recipe ${recipeId}`, error);
      throw error;
    }
  }

  async deleteRecipe(recipeId: string) {
    try {
      await this.elasticsearchService.delete({
        index: this.indexName,
        id: recipeId,
      });
      this.logger.log(`Recipe ${recipeId} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete recipe ${recipeId}`, error);
      throw error;
    }
  }

  async searchRecipes(searchParams: {
    query?: string;
    ingredients?: string[];
    cuisine?: string;
    difficulty?: number;
    maxCookTime?: number;
    minRating?: number;
    skip?: number;
    take?: number;
    sortBy?: string;
  }) {
    const {
      query,
      ingredients,
      cuisine,
      difficulty,
      maxCookTime,
      minRating,
      skip = 0,
      take = 20,
      sortBy = 'relevance',
    } = searchParams;

    const must: any[] = [];
    const filter: any[] = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['title^3', 'description^2', 'ingredients.name^2', 'cuisine'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    if (ingredients && ingredients.length > 0) {
      const ingredientQueries = ingredients.map((ingredient) => ({
        nested: {
          path: 'ingredients',
          query: {
            match: {
              'ingredients.name': {
                query: ingredient,
                fuzziness: 'AUTO',
              },
            },
          },
        },
      }));

      must.push({
        bool: {
          should: ingredientQueries,
          minimum_should_match: Math.ceil(ingredients.length * 0.6),
        },
      });
    }

    if (cuisine) {
      filter.push({ term: { cuisine } });
    }

    if (difficulty) {
      filter.push({ term: { difficulty } });
    }

    if (maxCookTime) {
      filter.push({ range: { cookTime: { lte: maxCookTime } } });
    }

    if (minRating) {
      filter.push({ range: { averageRating: { gte: minRating } } });
    }

    let sort: any[];
    switch (sortBy) {
      case 'rating':
        sort = [{ averageRating: { order: 'desc' } }, { ratingsCount: { order: 'desc' } }, '_score'];
        break;
      case 'date':
        sort = [{ createdAt: { order: 'desc' } }, '_score'];
        break;
      case 'cookTime':
        sort = [{ cookTime: { order: 'asc' } }, '_score'];
        break;
      case 'relevance':
      default:
        sort = ['_score', { averageRating: { order: 'desc' } }];
        break;
    }

    try {
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter,
          },
        },
        sort,
        from: skip,
        size: take,
        highlight: {
          fields: {
            title: {},
            description: {},
            'ingredients.name': {},
          },
        },
      });

      const totalHits = response.hits.total;
      const total = typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;

      return {
        recipes: response.hits.hits.map((hit: any) => ({
          ...hit._source,
          score: hit._score,
          highlights: hit.highlight,
        })),
        total,
        skip,
        take,
      };
    } catch (error) {
      this.logger.error('Search failed', error);
      throw error;
    }
  }

  async getIngredientSuggestions(query: string, limit = 10) {
    try {
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        suggest: {
          ingredient_suggest: {
            text: query,
            completion: {
              field: 'ingredients.name.suggest',
              size: limit,
            },
          },
        },
      });

      const suggest = (response as any).suggest?.ingredient_suggest?.[0]?.options ?? [];
      const suggestions = (Array.isArray(suggest) ? suggest : [suggest]).map(
        (option: any) => option.text,
      );

      return [...new Set(suggestions)];
    } catch (error) {
      this.logger.error('Failed to get ingredient suggestions', error);
      return [];
    }
  }

  async getRecipeSuggestions(query: string, limit = 10) {
    try {
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        suggest: {
          recipe_suggest: {
            text: query,
            completion: {
              field: 'title.suggest',
              size: limit,
            },
          },
        },
      });

      const suggest = (response as any).suggest?.recipe_suggest?.[0]?.options ?? [];
      return (Array.isArray(suggest) ? suggest : [suggest]).map((option: any) => option.text);
    } catch (error) {
      this.logger.error('Failed to get recipe suggestions', error);
      return [];
    }
  }
}
