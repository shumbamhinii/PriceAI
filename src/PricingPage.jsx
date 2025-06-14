import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    Typography,
    Tabs,
    Tab,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    TextField,
    Grid,
    FormControlLabel,
    Switch,
    IconButton,
    InputAdornment, // Added for currency symbol
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear'; // Assuming you have this icon
import AddIcon from '@mui/icons-material/Add'; // For add expense/product
import RemoveIcon from '@mui/icons-material/Remove'; // For remove expense/product
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { motion } from 'framer-motion';
import axios from 'axios';

// Import your sub-components (assuming they are in separate files)
// You'll need to create BudgetTab.jsx as shown below
import ResultsTab from './ResultsTab';
import WhatIfScenariosTab from './WhatIfScenariosTab';
import CompetitorPricingTab from './CompetitorPricingTab';
import SnapshotManager from './SnapshotManager';
import BudgetTab from './BudgetTab'; // NEW: Import BudgetTab

// Base URL for your backend API (ensure this is correct for your setup)
const API_BASE_URL = 'https://priceaibback.onrender.com';

// Custom Material-UI theme based on your screenshot's color scheme
const theme = createTheme({
  palette: {
    primary: {
      main: '#c88a31',
      contrastText: '#fff',
    },
    secondary: {
      main: '#1a1919',
      contrastText: '#c88a31',
    },
    background: {
      default: '#f5f5f5',
      paper: '#fff',
    },
    text: {
      primary: '#1a1919',
      secondary: '#555',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
    },
    success: {
      main: '#4caf50',
    },
  },
  typography: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    h3: {
      fontWeight: 900,
      letterSpacing: '0.1rem',
      color: '#c88a31',
      textShadow: '0 2px 6px rgba(200, 138, 49, 0.5)',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          fontWeight: 'bold',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease, color 0.3s ease',
          '&:hover': {
            transform: 'scale(1.03)',
          },
        },
        containedPrimary: {
          backgroundColor: '#1a1919',
          color: '#c88a31',
          boxShadow: '0 8px 20px rgba(200, 138, 49, 0.3)',
          '&:hover': {
            backgroundColor: '#000',
            boxShadow: '0 15px 30px rgba(200, 138, 49, 0.6)',
          },
        },
        outlinedPrimary: {
          borderColor: '#c88a31',
          color: '#c88a31',
          backgroundColor: 'transparent',
          boxShadow: '0 8px 20px rgba(200, 138, 49, 0.3)',
          '&:hover': {
            backgroundColor: 'rgba(200, 138, 49, 0.1)',
            boxShadow: '0 15px 30px rgba(200, 138, 49, 0.6)',
            borderColor: '#c88a31',
          },
        },
        containedSecondary: {
          backgroundColor: '#c88a31',
          color: '#1a1919',
          '&:hover': {
            backgroundColor: '#e09a40',
          }
        }
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: '#1a1919',
          padding: '12px 24px',
          justifyContent: 'flex-start',
          textAlign: 'left',
          '&.Mui-selected': {
            color: '#c88a31',
            fontWeight: 'bold',
            backgroundColor: 'rgba(200, 138, 49, 0.1)',
          },
          '&:hover': {
            backgroundColor: 'rgba(200, 138, 49, 0.05)',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#c88a31',
          left: 0,
          width: '4px',
          right: 'auto',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          backgroundColor: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& label.Mui-focused': {
            color: '#c88a31',
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#ccc',
            },
            '&:hover fieldset': {
              borderColor: '#c88a31',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#c88a31',
            },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '16px',
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #eee',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          '&:not(:last-child)': {
            borderBottom: '1px solid #eee',
          },
        },
      },
    },
  },
});
// Assuming this calculateSnapshotPrices function is within your SnapshotManager component
// or a utility file it imports.
// Moved outside component to prevent re-creation on every render if it's a pure function.
const calculateSnapshotPrices = (snapshotData) => {
    const { products, total_cost, target_profit, target_margin } = snapshotData;

    // Convert fixed costs (expenses) to a single actual cost
    const actualCost = (snapshotData.expenses || []).reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

    // Determine the overall calculated profit based on use_margin
    let calculatedProfit = 0;
    const marginDecimal = parseFloat(target_margin) / 100 || 0;
    const totalRevenueValue = snapshotData.use_margin ?
        (actualCost / (1 - marginDecimal)) :
        (actualCost + (parseFloat(target_profit) || 0));

    calculatedProfit = totalRevenueValue - actualCost;

    const percentageBasedProducts = products.filter(p => (p.calculation_method || 'cost-plus') === 'percentage');
    const costPlusBasedProducts = products.filter(p => (p.calculation_method || 'cost-plus') === 'cost-plus');

    const fixedCostAllocatedToPercentageProducts = percentageBasedProducts.reduce((sum, p) => {
        const productExpectedRevenue = (parseFloat(p.revenue_percentage) || 0) * totalRevenueValue;
        return sum + ((productExpectedRevenue / totalRevenueValue) * actualCost);
    }, 0);

    const fixedCostAllocatedToCostPlusProducts = actualCost - fixedCostAllocatedToPercentageProducts;

    const profitFromPercentageProducts = percentageBasedProducts.reduce((sum, p) => {
        const productExpectedRevenue = (parseFloat(p.revenue_percentage) || 0) * totalRevenueValue;
        const productVariableCost = (parseFloat(p.cost_per_unit) || 0) * (parseFloat(p.expected_units) || 0);
        const productAllocatedFixedCost = ((productExpectedRevenue / totalRevenueValue) * actualCost);
        return sum + (productExpectedRevenue - productVariableCost - productAllocatedFixedCost);
    }, 0);

    const profitNeededFromCostPlusProducts = calculatedProfit - profitFromPercentageProducts;

    const totalExpectedUnitsCostPlus = costPlusBasedProducts.reduce((sum, p) => sum + (parseFloat(p.expected_units) || 0), 0);

    const calculatedProducts = products.map((product) => {
        const safeExpectedUnits = parseFloat(product.expected_units) > 0 ? parseFloat(product.expected_units) : 1;
        const safeCostPerUnit = parseFloat(product.cost_per_unit) || 0;
        const calculationMethod = product.calculation_method || 'cost-plus';

        let suggestedPrice = 0;
        let percentageRevenue = 0;
        let suggestedProfitPerUnit = 0;

        if (calculationMethod === 'percentage') {
            const safeRevenuePercentage = parseFloat(product.revenue_percentage) || 0;
            const revenueShare = safeRevenuePercentage * totalRevenueValue;
            suggestedPrice = safeExpectedUnits > 0 ? (revenueShare / safeExpectedUnits) : 0;
            suggestedPrice = Math.round(suggestedPrice * 100) / 100;

            const productRevenue = suggestedPrice * safeExpectedUnits;
            const productVariableCost = safeCostPerUnit * safeExpectedUnits;
            const productAllocatedFixedCost = (productRevenue / totalRevenueValue) * actualCost;
            const productProfit = productRevenue - productVariableCost - productAllocatedFixedCost;
            percentageRevenue = productRevenue > 0 ? (productProfit / productRevenue) * 100 : 0;
            suggestedProfitPerUnit = safeExpectedUnits > 0 ? productProfit / safeExpectedUnits : 0;

        } else { // 'cost-plus' method
            let profitPerUnitFromDistribution = 0;
            let fixedCostPerUnitFromDistribution = 0;

            if (totalExpectedUnitsCostPlus > 0) {
                profitPerUnitFromDistribution = profitNeededFromCostPlusProducts / totalExpectedUnitsCostPlus;
                fixedCostPerUnitFromDistribution = fixedCostAllocatedToCostPlusProducts / totalExpectedUnitsCostPlus;
            }

            suggestedProfitPerUnit = profitPerUnitFromDistribution + fixedCostPerUnitFromDistribution;

            if (safeExpectedUnits === 0 || totalExpectedUnitsCostPlus === 0) {
                suggestedProfitPerUnit = safeCostPerUnit * 0.20; // Default 20% markup if not participating in distribution
            }

            suggestedPrice = safeCostPerUnit + suggestedProfitPerUnit;
            suggestedPrice = Math.round(suggestedPrice * 100) / 100;

            const productRevenue = suggestedPrice * safeExpectedUnits;
            const thisProductFixedCostShare = fixedCostPerUnitFromDistribution * safeExpectedUnits;
            const productTotalCost = (safeCostPerUnit * safeExpectedUnits) + thisProductFixedCostShare;
            percentageRevenue = productRevenue > 0 ? ((productRevenue - productTotalCost) / productRevenue) * 100 : 0;
        }

        return {
            id: product.id,
            name: product.name,
            percentage: calculationMethod === 'percentage' ? (parseFloat(product.revenue_percentage) * 100) : 0,
            expectedUnits: parseFloat(product.expected_units) || 0,
            costPerUnit: safeCostPerUnit,
            price: suggestedPrice,
            unitsNeeded: calculationMethod === 'percentage' ? (suggestedPrice > 0 ? Math.ceil((parseFloat(product.revenue_percentage) || 0) * totalRevenueValue / suggestedPrice) : 0) : parseFloat(product.expected_units) || 0,
            percentageRevenue: percentageRevenue,
            calculationMethod: calculationMethod,
            suggestedProfit: suggestedProfitPerUnit,
            minQuantity: product.minQuantity,
            maxQuantity: product.maxQuantity,
            notes: product.notes,
            category: product.category,
            // Ensure directCosts are passed along for each product
            directCosts: product.directCosts || [],
        };
    });

    return {
        actualCost: parseFloat(actualCost) || 0,
        totalRevenue: parseFloat(totalRevenueValue) || 0,
        calculatedProfit: parseFloat(calculatedProfit) || 0,
        calculatedProducts,
        inputs: snapshotData
    };
};


const PricingPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // State for Setup Tab
    const [totalCost, setTotalCost] = useState(0);
    const [useBreakdown, setUseBreakdown] = useState(false);
    const [individualCosts, setIndividualCosts] = useState([{ label: '', amount: 0 }]);
    const [useMargin, setUseMargin] = useState(false);
    const [targetProfit, setTargetProfit] = useState(0);
    const [targetMargin, setTargetMargin] = useState(0);

    // State for Products Tab
    const [products, setProducts] = useState([
        {
            name: '',
            percentage: 0,
            expectedUnits: 0,
            costPerUnit: 0,
            calculationMethod: 'cost-plus', // Default to percentage
            directCosts: [], // For direct costs specific to a product
        },
    ]);

    // State for Results Tab
    const [calculatedResults, setCalculatedResults] = useState(null);

    // State for Competitor Pricing Tab
    const [competitorPrices, setCompetitorPrices] = useState({});

    // Derived states (similar to your original code, but explicit)
    const totalFromBreakdown = individualCosts.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0);
    const actualCost = useBreakdown ? totalFromBreakdown : parseFloat(totalCost) || 0;

    const calculatePrices = useCallback(() => {
        setLoading(true);
        setError('');
        setSuccessMessage('');

        const dataForCalculation = {
            total_cost: actualCost,
            use_margin: useMargin,
            target_profit: targetProfit,
            target_margin: targetMargin,
            use_breakdown: useBreakdown,
            products: products.map(p => ({
                ...p,
                // Ensure correct format for backend (0-1 for revenue_percentage)
                revenue_percentage: p.calculationMethod === 'percentage' ? (parseFloat(p.percentage) / 100) : 0,
                expected_units: p.expectedUnits,
                cost_per_unit: p.costPerUnit,
            })),
            expenses: useBreakdown ? individualCosts : [],
        };

        try {
            // Using the calculateSnapshotPrices utility function
            const results = calculateSnapshotPrices(dataForCalculation);
            setCalculatedResults(results);
            setSuccessMessage('Prices calculated successfully!');
        } catch (err) {
            console.error('Error during price calculation:', err);
            setError(`Failed to calculate prices: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [actualCost, useMargin, targetProfit, targetMargin, useBreakdown, products, individualCosts]);

    // Effect to trigger calculation whenever inputs change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            calculatePrices();
        }, 500); // Debounce calculation to avoid excessive re-renders/computations
        return () => clearTimeout(timeoutId);
    }, [products, totalCost, individualCosts, useBreakdown, useMargin, targetProfit, targetMargin, calculatePrices]);

    const clearAllValues = () => {
        setTotalCost(0);
        setUseBreakdown(false);
        setIndividualCosts([{ label: '', amount: 0 }]);
        setUseMargin(false);
        setTargetProfit(0);
        setTargetMargin(0);
        setProducts([
            {
                name: '',
                percentage: 0,
                expectedUnits: 0,
                costPerUnit: 0,
                calculationMethod: 'cost-plus',
                directCosts: [],
            },
        ]);
        setCompetitorPrices({});
        setCalculatedResults(null);
        setError('');
        setSuccessMessage('All values cleared.');
    };


    const handleProductChange = (index, field, value) => {
        const newProducts = [...products];
        newProducts[index][field] = value;
        setProducts(newProducts);
    };

    const addProduct = () => {
        setProducts([
            ...products,
            {
                name: '',
                percentage: 0,
                expectedUnits: 0,
                costPerUnit: 0,
                calculationMethod: 'cost-plus',
                directCosts: [],
            },
        ]);
    };

    const removeProduct = (index) => {
        const newProducts = products.filter((_, i) => i !== index);
        setProducts(newProducts);
    };

    const handleDirectCostChange = (productIndex, dcIndex, field, value) => {
        const newProducts = [...products];
        newProducts[productIndex].directCosts[dcIndex][field] = value;
        setProducts(newProducts);
    };

    const addDirectCost = (productIndex) => {
        const newProducts = [...products];
        if (!newProducts[productIndex].directCosts) {
            newProducts[productIndex].directCosts = [];
        }
        newProducts[productIndex].directCosts.push({ description: '', amount: 0 });
        setProducts(newProducts);
    };

    const removeDirectCost = (productIndex, dcIndex) => {
        const newProducts = [...products];
        newProducts[productIndex].directCosts = newProducts[productIndex].directCosts.filter((_, i) => i !== dcIndex);
        setProducts(newProducts);
    };

    const handleSnapshotLoaded = useCallback((snapshotData) => {
        setTotalCost(snapshotData.totalCost);
        setUseBreakdown(snapshotData.useBreakdown);
        setIndividualCosts(snapshotData.individualCosts);
        setUseMargin(snapshotData.useMargin);
        setTargetProfit(snapshotData.targetProfit);
        setTargetMargin(snapshotData.targetMargin);
        setProducts(snapshotData.products.map(p => ({
            ...p,
            expectedUnits: p.expectedUnits || 0, // Ensure expectedUnits is not undefined
            costPerUnit: p.costPerUnit || 0,
            // Ensure directCosts are loaded if present
            directCosts: p.directCosts || [],
        })));
        setCompetitorPrices(snapshotData.competitorPrices || {});
        // This will trigger the useEffect to recalculate prices
    }, []);

    // Placeholder for the handler that sends snapshot data to QuotationsPage
    const handleUseForQuotations = useCallback((snapshotData) => {
        // This function will be called from SnapshotManager to navigate to QuotationsPage
        // The data is passed via location state
        if (snapshotData) {
            navigate('/quotations', {
                state: {
                    products: snapshotData.calculatedProducts, // Use the calculated products from the snapshot
                    snapshotName: snapshotData.inputs.name // Use the name from the original input data
                }
            });
        } else {
            // Handle clearing the quotation snapshot (e.g., if deleted)
            navigate('/quotations', { state: { products: [], snapshotName: '' } });
        }
    }, [navigate]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Container
                maxWidth="false"
                sx={{
                    display: 'flex',
                    minHeight: '100vh',
                    width: '100vw',
                    backgroundColor: theme.palette.background.default,
                    p: 0,
                }}
            >
                <Box
                    sx={{
                        width: 240,
                        flexShrink: 0,
                        backgroundColor: theme.palette.background.paper,
                        borderRight: `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        flexDirection: 'column',
                        pt: 4,
                        pb: 2,
                    }}
                >
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                        <IconButton
                            onClick={() => navigate('/')} // <--- ENSURE THIS IS '/'
                            aria-label="back to home page"
                            sx={{ mr: 1, color: theme.palette.primary.main }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6" align="center" sx={{ mb: 4, color: theme.palette.primary.main }}>
                            PriceMind AI
                        </Typography>
                    </motion.div>
                    <Tabs
                        orientation="vertical"
                        value={activeTab}
                        onChange={(e, newVal) => setActiveTab(newVal)}
                        aria-label="Vertical tabs example"
                        sx={{
                            borderRight: 0,
                            '& .MuiTabs-flexContainerVertical': {
                                alignItems: 'flex-start',
                            },
                        }}
                    >
                        <Tab label="Setup" />
                        <Tab label="Products" />
                        <Tab label="Results" />
                        <Tab label="Budget" /> {/* NEW: Budget Tab */}
                        <Tab label="What-If Scenarios" />
                        <Tab label="Competitor Pricing" />
                        <Tab label="Snapshots" />
                    </Tabs>
                </Box>

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 4,
                        width: 'calc(100vw - 240px)',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                            <CircularProgress color="primary" />
                        </Box>
                    )}

                    {error && <Alert severity="error" sx={{ mb: 2, maxWidth: '800px', width: '100%' }}>{error}</Alert>}
                    {successMessage && <Alert severity="success" sx={{ mb: 2, maxWidth: '800px', width: '100%' }}>{successMessage}</Alert>}

                    {activeTab === 0 && (
                        <Card elevation={3} sx={{ mb: 4, width: '100%', maxWidth: '800px' }}>
                            <CardContent>
                                <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
                                    <Box display="flex" alignItems="center" gap={2} width="80%">
                                        <Button
                                            variant={useBreakdown ? 'outlined' : 'contained'}
                                            color="primary"
                                            onClick={() => setUseBreakdown(false)}
                                            fullWidth
                                            disabled={loading}
                                        >
                                            Enter Total Monthly Cost
                                        </Button>
                                        <Button
                                            variant={useBreakdown ? 'contained' : 'outlined'}
                                            color="primary"
                                            onClick={() => setUseBreakdown(true)}
                                            fullWidth
                                            disabled={loading}
                                        >
                                            Enter Individual Expenses
                                        </Button>
                                    </Box>

                                    {!useBreakdown ? (
                                        <TextField
                                            label="Total Monthly Cost (R)"
                                            type="number"
                                            value={totalCost === 0 ? '' : totalCost.toString().replace(/^0+/, '')}
                                            onChange={(e) => setTotalCost(parseFloat(e.target.value) || 0)}
                                            sx={{ width: '80%' }}
                                            disabled={loading}
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start">R</InputAdornment>,
                                            }}
                                        />
                                    ) : (
                                        <Box sx={{ width: '100%' }}>
                                            {individualCosts.map((cost, index) => (
                                                <Box key={index} display="flex" gap={2} alignItems="center" sx={{ mb: 1, px: '10%' }}>
                                                    <TextField
                                                        label="Expense Name"
                                                        value={cost.label}
                                                        onChange={(e) => {
                                                            const newCosts = [...individualCosts];
                                                            newCosts[index].label = e.target.value;
                                                            setIndividualCosts(newCosts);
                                                        }}
                                                        sx={{ flex: 1 }}
                                                        disabled={loading}
                                                    />
                                                    <TextField
                                                        label="Amount (R)"
                                                        type="number"
                                                        value={cost.amount === 0 ? '' : cost.amount.toString().replace(/^0+/, '')}
                                                        onChange={(e) => {
                                                            const newCosts = [...individualCosts];
                                                            newCosts[index].amount = parseFloat(e.target.value) || 0;
                                                            setIndividualCosts(newCosts);
                                                        }}
                                                        sx={{ width: 120 }}
                                                        disabled={loading}
                                                        InputProps={{
                                                            startAdornment: <InputAdornment position="start">R</InputAdornment>,
                                                        }}
                                                    />
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => {
                                                            const newCosts = individualCosts.filter((_, i) => i !== index);
                                                            setIndividualCosts(newCosts);
                                                        }}
                                                        disabled={loading}
                                                    >
                                                        <RemoveIcon />
                                                    </IconButton>
                                                </Box>
                                            ))}
                                            <Box textAlign="center" mt={2}>
                                                <Button onClick={() => setIndividualCosts([...individualCosts, { label: '', amount: 0 }])} disabled={loading} color="primary" startIcon={<AddIcon />}>
                                                    Add Expense
                                                </Button>
                                            </Box>
                                            <Typography align="center" mt={2} fontWeight={600}>
                                                Total Monthly Cost: R{totalFromBreakdown.toFixed(2)}
                                            </Typography>
                                        </Box>
                                    )}

                                    <Box display="flex" alignItems="center" gap={2} width="80%">
                                        <Button
                                            variant={useMargin ? 'outlined' : 'contained'}
                                            color="primary"
                                            onClick={() => setUseMargin(false)}
                                            fullWidth
                                            disabled={loading}
                                        >
                                            Target Profit (R)
                                        </Button>
                                        <Button
                                            variant={useMargin ? 'contained' : 'outlined'}
                                            color="primary"
                                            onClick={() => setUseMargin(true)}
                                            fullWidth
                                            disabled={loading}
                                        >
                                            Target Margin (%)
                                        </Button>
                                    </Box>

                                    {!useMargin ? (
                                        <TextField
                                            label="Target Profit (R)"
                                            type="number"
                                            value={targetProfit === 0 ? '' : targetProfit.toString().replace(/^0+/, '')}
                                            onChange={(e) => setTargetProfit(parseFloat(e.target.value) || 0)}
                                            sx={{ width: '80%' }}
                                            disabled={loading}
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start">R</InputAdornment>,
                                            }}
                                        />
                                    ) : (
                                        <TextField
                                            label="Target Margin %"
                                            type="number"
                                            value={targetMargin === 0 ? '' : targetMargin.toString().replace(/^0+/, '')}
                                            onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 0)}
                                            sx={{ width: '80%' }}
                                            inputProps={{ min: 0, max: 99 }}
                                            disabled={loading}
                                        />
                                    )}

                                    <Button variant="contained" color="primary" onClick={calculatePrices} disabled={loading}>
                                        Submit
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        onClick={clearAllValues}
                                        disabled={loading}
                                        startIcon={<ClearIcon />}
                                        sx={{ mt: 2 }}
                                    >
                                        Clear All Values
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 1 && (
                        <>
                            <Grid container spacing={2} sx={{ maxWidth: '800px', width: '100%' }}>
                                {products.map((product, index) => (
                                    <Grid item xs={12} key={index}>
                                        <Card elevation={2}>
                                            <CardContent>
                                                <Grid container spacing={2} alignItems="center">
                                                    <Grid item xs={12} sm={4}>
                                                        <TextField
                                                            fullWidth
                                                            label="Product Name"
                                                            value={product.name}
                                                            onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                                                            disabled={loading}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} sm={8}>
                                                        <FormControlLabel
                                                            control={
                                                                <Switch
                                                                    checked={product.calculationMethod === 'cost-plus'}
                                                                    onChange={(e) => handleProductChange(index, 'calculationMethod', e.target.checked ? 'cost-plus' : 'percentage')}
                                                                    name={`calculationMethod-${index}`}
                                                                    color="primary"
                                                                    disabled={loading}
                                                                />
                                                            }
                                                            label={product.calculationMethod === 'cost-plus' ? 'Cost-Plus Calculation' : 'Percentage Revenue Calculation'}
                                                        />
                                                    </Grid>

                                                    {product.calculationMethod === 'percentage' && (
                                                        <>
                                                            <Grid item xs={12} sm={3}>
                                                                <TextField
                                                                    fullWidth
                                                                    label="% Revenue Share"
                                                                    type="number"
                                                                    value={product.percentage === 0 ? '' : product.percentage.toString().replace(/^0+/, '')}
                                                                    onChange={(e) => handleProductChange(index, 'percentage', e.target.value)}
                                                                    inputProps={{ min: 0, max: 100 }}
                                                                    disabled={loading}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} sm={2}>
                                                                <TextField
                                                                    fullWidth
                                                                    label="Units"
                                                                    type="number"
                                                                    value={product.expectedUnits === 0 ? '' : product.expectedUnits.toString().replace(/^0+/, '')}
                                                                    onChange={(e) => handleProductChange(index, 'expectedUnits', e.target.value)}
                                                                    inputProps={{ min: 1 }}
                                                                    disabled={loading}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} sm={2}>
                                                                <TextField
                                                                    fullWidth
                                                                    label="Base Cost/Unit (R)"
                                                                    type="number"
                                                                    value={product.costPerUnit === 0 ? '' : product.costPerUnit.toString().replace(/^0+/, '')}
                                                                    onChange={(e) => handleProductChange(index, 'costPerUnit', parseFloat(e.target.value) || 0)}
                                                                    inputProps={{ min: 0 }}
                                                                    disabled={loading}
                                                                    InputProps={{
                                                                        startAdornment: <InputAdornment position="start">R</InputAdornment>,
                                                                    }}
                                                                />
                                                            </Grid>
                                                        </>
                                                    )}

                                                    {product.calculationMethod === 'cost-plus' && (
                                                        <>
                                                            <Grid item xs={12} sm={4}>
                                                                <TextField
                                                                    fullWidth
                                                                    label="Units"
                                                                    type="number"
                                                                    value={product.expectedUnits === 0 ? '' : product.expectedUnits.toString().replace(/^0+/, '')}
                                                                    onChange={(e) => handleProductChange(index, 'expectedUnits', e.target.value)}
                                                                    inputProps={{ min: 1 }}
                                                                    disabled={loading}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} sm={4}>
                                                                <TextField
                                                                    fullWidth
                                                                    label="Base Cost/Unit (R)"
                                                                    type="number"
                                                                    value={product.costPerUnit === 0 ? '' : product.costPerUnit.toString().replace(/^0+/, '')}
                                                                    onChange={(e) => handleProductChange(index, 'costPerUnit', parseFloat(e.target.value) || 0)}
                                                                    inputProps={{ min: 0 }}
                                                                    disabled={loading}
                                                                    InputProps={{
                                                                        startAdornment: <InputAdornment position="start">R</InputAdornment>,
                                                                    }}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} sm={4}>
                                                                <TextField
                                                                    fullWidth
                                                                    label="Recommended Profit per Unit (R)"
                                                                    type="number"
                                                                    value={
                                                              typeof (calculatedResults?.calculatedProducts[index]?.suggestedProfit) === 'number' && !isNaN(calculatedResults?.calculatedProducts[index]?.suggestedProfit)
                                                            ? calculatedResults.calculatedProducts[index].suggestedProfit.toFixed(2)
                                                            : 'N/A'}
                                                                    InputProps={{
                                                                        readOnly: true,
                                                                        startAdornment: <InputAdornment position="start">R</InputAdornment>,
                                                                    }}
                                                                    disabled={loading}
                                                                />
                                                            </Grid>
                                                        </>
                                                    )}

                                                    {/* NEW SECTION FOR DIRECT COSTS */}
                                                    <Grid item xs={12}>
                                                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                                                            Direct Costs for {product.name} (Total for all {product.expectedUnits} units)
                                                        </Typography>
                                                        {product.directCosts.map((directCost, dcIndex) => (
                                                            <Box key={dcIndex} display="flex" gap={1} alignItems="center" sx={{ mb: 1 }}>
                                                                <TextField
                                                                    label="Cost Description"
                                                                    value={directCost.description}
                                                                    onChange={(e) => handleDirectCostChange(index, dcIndex, 'description', e.target.value)}
                                                                    sx={{ flex: 1 }}
                                                                    disabled={loading}
                                                                />
                                                                <TextField
                                                                    label="Amount (Total R)"
                                                                    type="number"
                                                                    value={directCost.amount === 0 ? '' : directCost.amount.toString().replace(/^0+/, '')}
                                                                    onChange={(e) => handleDirectCostChange(index, dcIndex, 'amount', parseFloat(e.target.value) || 0)}
                                                                    sx={{ width: 120 }}
                                                                    disabled={loading}
                                                                    InputProps={{
                                                                        startAdornment: <InputAdornment position="start">R</InputAdornment>,
                                                                    }}
                                                                />
                                                                <IconButton
                                                                    color="error"
                                                                    onClick={() => removeDirectCost(index, dcIndex)}
                                                                    disabled={loading}
                                                                >
                                                                    <RemoveIcon />
                                                                </IconButton>
                                                            </Box>
                                                        ))}
                                                        <Box textAlign="center" mt={1}>
                                                            <Button
                                                                onClick={() => addDirectCost(index)}
                                                                disabled={loading}
                                                                color="primary"
                                                                variant="outlined"
                                                                size="small"
                                                                startIcon={<AddIcon />}
                                                            >
                                                                Add Direct Cost
                                                            </Button>
                                                        </Box>
                                                    </Grid>
                                                    {/* END NEW SECTION */}

                                                    <Grid item xs={12} sm={1}>
                                                        <IconButton
                                                            color="error"
                                                            onClick={() => removeProduct(index)}
                                                            disabled={loading}
                                                        >
                                                            <ClearIcon /> {/* Changed from X to ClearIcon */}
                                                        </IconButton>
                                                    </Grid>
                                                </Grid>
                                                <Typography mt={2} fontWeight={600}>
                                                    Recommended Retail Price: R
                                                    {typeof (calculatedResults?.calculatedProducts[index]?.price) === 'number' && !isNaN(calculatedResults?.calculatedProducts[index]?.price)
                                                        ? calculatedResults.calculatedProducts[index].price.toFixed(2)
                                                        : 'N/A'}
                                                </Typography>

                                                <Typography mt={1} color="text.secondary">
                                                    Percentage Revenue:
                                                    {typeof (calculatedResults?.calculatedProducts[index]?.percentageRevenue) === 'number' && !isNaN(calculatedResults?.calculatedProducts[index]?.percentageRevenue)
                                                        ? calculatedResults.calculatedProducts[index].percentageRevenue.toFixed(2)
                                                        : 'N/A'}
                                                    %
                                                </Typography>

                                                {products[index].calculationMethod === 'percentage' && (
                                                    <Typography mt={1} color="text.secondary">
                                                        Units Needed to Sell:
                                                        {typeof (calculatedResults?.calculatedProducts[index]?.unitsNeeded) === 'number' && !isNaN(calculatedResults?.calculatedProducts[index]?.unitsNeeded)
                                                            ? Math.ceil(calculatedResults.calculatedProducts[index].unitsNeeded)
                                                            : 'N/A'}
                                                        (based on revenue share)
                                                    </Typography>
                                                )}

                                                {products[index].calculationMethod === 'cost-plus' && (
                                                    <Typography mt={1} color="text.secondary">
                                                        This product contributes R
                                                        {typeof (calculatedResults?.calculatedProducts[index]?.suggestedProfit) === 'number' && !isNaN(calculatedResults?.calculatedProducts[index]?.suggestedProfit)
                                                            ? calculatedResults.calculatedProducts[index].suggestedProfit.toFixed(2)
                                                            : 'N/A'}
                                                        profit per unit (including its share of fixed costs).
                                                    </Typography>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                                <Grid item xs={12} sx={{ textAlign: 'center' }}>
                                    <Button onClick={addProduct} disabled={loading} color="primary" variant="contained" startIcon={<AddIcon />}>
                                        Add Product
                                    </Button>
                                </Grid>
                                {products.filter(p => p.calculationMethod === 'percentage').length > 0 && (
                                    <Grid item xs={12}>
                                        <Alert severity={Math.round(products.filter(p => p.calculationMethod === 'percentage').reduce((sum, p) => sum + (parseFloat(p.percentage) || 0), 0)) === 100 ? 'success' : 'warning'} sx={{ mt: 2 }}>
                                            Total Percentage of Revenue Share: {products.filter(p => p.calculationMethod === 'percentage').reduce((sum, p) => sum + (parseFloat(p.percentage) || 0), 0).toFixed(2)}% (Should be 100%)
                                        </Alert>
                                    </Grid>
                                )}
                            </Grid>
                        </>
                    )}

                    {activeTab === 2 && calculatedResults && ( // Render ResultsTab only if calculatedResults exist
                        <ResultsTab
                            products={calculatedResults.calculatedProducts} // Pass calculated products
                            totalRevenue={calculatedResults.totalRevenue}
                            actualCost={calculatedResults.actualCost}
                            calculatedProfit={calculatedResults.calculatedProfit}
                            useMargin={useMargin}
                            targetProfit={targetProfit}
                            targetMargin={targetMargin}
                            loading={loading}
                            error={error}
                        />
                    )}

                    {/* Budget Tab Content */}
                    {activeTab === 3 && ( // This is the correct activeTab index for BudgetTab
                        <BudgetTab
                            totalRevenue={calculatedResults?.totalRevenue || 0}
                            calculatedProfit={calculatedResults?.calculatedProfit || 0}
                            products={calculatedResults?.calculatedProducts || products} //{/* Pass main products state as a fallback for initial values */}
                            actualCost={calculatedResults?.actualCost || actualCost}// {/* Pass actualCost as a fallback for initial values */}
                            loading={loading}
                            // Pass additional initial state for hypothetical calculations in BudgetTab
                            initialUseMargin={useMargin}
                            initialTargetProfit={targetProfit}
                            initialTargetMargin={targetMargin}
                        />
                    )}

                    {activeTab === 4 && (
                        <WhatIfScenariosTab
                            // Pass calculated products for what-if analysis
                            products={calculatedResults?.calculatedProducts || products}
                            totalCost={calculatedResults?.actualCost || totalCost} // Use calculated actualCost if available
                            targetProfit={calculatedResults?.calculatedProfit || targetProfit} // Use calculated profit if available
                            targetMargin={targetMargin} // Original targetMargin is fine here
                            useMargin={useMargin} // Original useMargin is fine here
                            actualCost={calculatedResults?.actualCost || actualCost} // Redundant if totalCost is passed, but keeping for clarity if WhatIfScenariosTab uses it
                            loading={loading}
                            error={error}
                            calculatePrices={calculatePrices}
                            totalRevenue={calculatedResults?.totalRevenue || 0} // NEW: Pass totalRevenue
                        />
                    )}

                    {activeTab === 5 && (
                        <CompetitorPricingTab
                            // Pass calculated products for competitor pricing comparison
                            products={calculatedResults?.calculatedProducts || products}
                            initialCompetitorPrices={competitorPrices}
                            onCompetitorPricesChange={setCompetitorPrices}
                            totalRevenue={calculatedResults?.totalRevenue || 0} // NEW: Pass totalRevenue
                        />
                    )}

                    {activeTab === 6 && (
                        <SnapshotManager
                            loading={loading}
                            setLoading={setLoading}
                            setError={setError}
                            setSuccessMessage={setSuccessMessage}
                            currentPricingState={{
                                totalCost,
                                targetProfit,
                                targetMargin,
                                useMargin,
                                useBreakdown,
                                individualCosts,
                                products, // This should remain the input products for saving
                                actualCost,
                                competitorPrices,
                            }}
                            onSnapshotLoaded={handleSnapshotLoaded}
                            onCalculatePrices={calculatePrices}
                            setActiveTab={setActiveTab}
                            onUseForQuotations={handleUseForQuotations}
                        />
                    )}
                </Box>
            </Container>
        </ThemeProvider>
    );
};

export default PricingPage;
