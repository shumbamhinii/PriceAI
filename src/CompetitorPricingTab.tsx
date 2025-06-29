import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useTheme
} from '@mui/material';

interface Product {
  name: string;
  price: number;
}

interface CompetitorPricingTabProps {
  products: Product[];
  // NEW PROP: Pass initial competitor prices from the snapshot
  initialCompetitorPrices?: { [productName: string]: number };
  // NEW PROP: Callback to save competitor prices to the parent/snapshot
  onCompetitorPricesChange: (prices: { [productName: string]: number }) => void;
}

interface CompetitorPrice {
  [productName: string]: number;
}

const CompetitorPricingTab: React.FC<CompetitorPricingTabProps> = ({
  products,
  initialCompetitorPrices, // Accept initial prices
  onCompetitorPricesChange // Accept the callback
}) => {
  const [competitorPrices, setCompetitorPrices] = useState<CompetitorPrice>({});
  const theme = useTheme();

  useEffect(() => {
    // When the component mounts or products change,
    // initialize competitorPrices.
    // Prioritize initialCompetitorPrices from snapshot if available,
    // otherwise, create a default structure from products.
    const newPrices: CompetitorPrice = {};
    products.forEach(p => {
      // Use price from initialCompetitorPrices if it exists for this product,
      // otherwise default to 0
      newPrices[p.name] = initialCompetitorPrices?.[p.name] || 0;
    });
    setCompetitorPrices(newPrices);
  }, [products, initialCompetitorPrices]); // Depend on products and initialCompetitorPrices

  const handlePriceChange = (productName: string, value: number) => {
    setCompetitorPrices((prev) => {
      const updatedPrices = {
        ...prev,
        [productName]: value,
      };
      // Call the callback to pass updated prices to the parent
      onCompetitorPricesChange(updatedPrices);
      return updatedPrices;
    });
  };

  return (
    <Card
      sx={{
        maxWidth: 800,
        mx: 'auto',
      }}
    >
      <CardContent>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ color: theme.palette.text.primary }}
        >
          Competitor Pricing Comparison
        </Typography>
        <Typography
          variant="subtitle1"
          gutterBottom
          sx={{ color: theme.palette.text.secondary }}
        >
          Enter competitor prices for your products to compare and get pricing insights.
        </Typography>

        <Table
          sx={{
            borderCollapse: 'separate',
            borderSpacing: '0 8px',
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>Product</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>Your Price</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>Competitor Price</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>Difference</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>Suggestion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => {
              const yourPrice = product.price || 0;
              const competitorPrice = competitorPrices[product.name] || 0;
              const diff = yourPrice - competitorPrice;
              const diffPercent = competitorPrice > 0 ? (diff / competitorPrice) * 100 : 0;

              let suggestion = '';
              let suggestionSeverity: 'error' | 'warning' | 'success' | undefined;

              if (competitorPrice === 0) {
                suggestion = 'No competitor price entered';
                suggestionSeverity = undefined;
              } else if (diff > 0) {
                suggestion = `Your price is ${diffPercent.toFixed(1)}% higher`;
                suggestionSeverity = 'warning';
              } else if (diff < 0) {
                suggestion = `Your price is ${Math.abs(diffPercent).toFixed(1)}% lower`;
                suggestionSeverity = 'success';
              } else {
                suggestion = 'Prices are equal';
                suggestionSeverity = 'success';
              }

              return (
                <TableRow
                  key={product.name}
                  sx={{
                    '&:nth-of-type(odd)': {
                      backgroundColor: theme.palette.action.hover,
                    },
                    borderRadius: '8px',
                  }}
                >
                  <TableCell>{product.name}</TableCell>
                  <TableCell sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
                    R{yourPrice.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={competitorPrice}
                      onChange={(e) =>
                        handlePriceChange(product.name, Number(e.target.value))
                      }
                      inputProps={{ min: 0, step: 0.01 }}
                      sx={{
                        width: '100px',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: diff > 0 ? theme.palette.error.main : diff < 0 ? theme.palette.success.main : theme.palette.text.primary }}>
                    R{diff.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Alert severity={suggestionSeverity} sx={{ p: '4px 8px', m: 0 }}>
                      {suggestion}
                    </Alert>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CompetitorPricingTab;