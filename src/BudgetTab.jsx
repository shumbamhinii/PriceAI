import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    TextField,
    Card,
    CardContent,
    Button,
    InputAdornment,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Grid,
    IconButton,
} from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import { motion } from 'framer-motion';

// Re-using the core pricing calculation logic for hypothetical scenarios
// This is a simplified version focusing on what's needed for the BudgetTab
const calculateHypotheticalPrices = (
    hypotheticalFixedCost,
    hypotheticalProducts,
    initialUseMargin,
    initialTargetProfit,
    initialTargetMargin
) => {
    const safeHypotheticalProducts = Array.isArray(hypotheticalProducts) ? hypotheticalProducts : [];

    // Calculate total actual cost (fixed expenses) - this is the hypothetical one now
    const currentActualFixedCost = parseFloat(hypotheticalFixedCost) || 0;

    // Determine the overall calculated profit based on use_margin
    let calculatedProfit = 0;
    const marginDecimal = parseFloat(initialTargetMargin) / 100 || 0;

    const totalRevenueValue = initialUseMargin ?
        (currentActualFixedCost / (1 - marginDecimal)) :
        (currentActualFixedCost + (parseFloat(initialTargetProfit) || 0));

    calculatedProfit = totalRevenueValue - currentActualFixedCost;

    const percentageBasedProducts = safeHypotheticalProducts.filter(p => (p.calculationMethod || 'cost-plus') === 'percentage');
    const costPlusBasedProducts = safeHypotheticalProducts.filter(p => (p.calculationMethod || 'cost-plus') === 'cost-plus');

    const fixedCostAllocatedToPercentageProducts = percentageBasedProducts.reduce((sum, p) => {
        const productExpectedRevenue = (p.revenue_percentage_original || (parseFloat(p.percentage) / 100) || 0) * totalRevenueValue;
        return sum + ((productExpectedRevenue / totalRevenueValue) * currentActualFixedCost);
    }, 0);

    const fixedCostAllocatedToCostPlusProducts = currentActualFixedCost - fixedCostAllocatedToPercentageProducts;

    const profitFromPercentageProducts = percentageBasedProducts.reduce((sum, p) => {
        const productExpectedRevenue = (p.revenue_percentage_original || (parseFloat(p.percentage) / 100) || 0) * totalRevenueValue;
        const productVariableCost = (parseFloat(p.hypotheticalCostPerUnit) || 0) * (parseFloat(p.hypotheticalExpectedUnits) || 0);
        const productAllocatedFixedCost = ((productExpectedRevenue / totalRevenueValue) * currentActualFixedCost);
        return sum + (productExpectedRevenue - productVariableCost - productAllocatedFixedCost);
    }, 0);

    const profitNeededFromCostPlusProducts = calculatedProfit - profitFromPercentageProducts;

    const totalExpectedUnitsCostPlus = costPlusBasedProducts.reduce((sum, p) => sum + (parseFloat(p.hypotheticalExpectedUnits) || 0), 0);

    const calculatedHypotheticalProducts = safeHypotheticalProducts.map((product) => {
        const safeHypotheticalExpectedUnits = parseFloat(product.hypotheticalExpectedUnits) > 0 ? parseFloat(product.hypotheticalExpectedUnits) : 1;
        const safeHypotheticalCostPerUnit = parseFloat(product.hypotheticalCostPerUnit) || 0;
        const calculationMethod = product.calculationMethod || 'cost-plus';

        let suggestedPrice = 0;
        let percentageRevenue = 0;
        let suggestedProfitPerUnit = 0;

        if (calculationMethod === 'percentage') {
            const safeRevenuePercentage = product.revenue_percentage_original || (parseFloat(product.percentage) / 100) || 0;
            const revenueShare = safeRevenuePercentage * totalRevenueValue;
            suggestedPrice = safeHypotheticalExpectedUnits > 0 ? (revenueShare / safeHypotheticalExpectedUnits) : 0;
            suggestedPrice = Math.round(suggestedPrice * 100) / 100;

            const productRevenue = suggestedPrice * safeHypotheticalExpectedUnits;
            const productVariableCost = safeHypotheticalCostPerUnit * safeHypotheticalExpectedUnits;
            const productAllocatedFixedCost = (productRevenue / totalRevenueValue) * currentActualFixedCost;
            const productProfit = productRevenue - productVariableCost - productAllocatedFixedCost;
            percentageRevenue = productRevenue > 0 ? (productProfit / productRevenue) * 100 : 0;
            suggestedProfitPerUnit = safeHypotheticalExpectedUnits > 0 ? productProfit / safeHypotheticalExpectedUnits : 0;

        } else { // 'cost-plus' method
            let profitPerUnitFromDistribution = 0;
            let fixedCostPerUnitFromDistribution = 0;

            if (totalExpectedUnitsCostPlus > 0) {
                profitPerUnitFromDistribution = profitNeededFromCostPlusProducts / totalExpectedUnitsCostPlus;
                fixedCostPerUnitFromDistribution = fixedCostAllocatedToCostPlusProducts / totalExpectedUnitsCostPlus;
            }

            suggestedProfitPerUnit = profitPerUnitFromDistribution + fixedCostPerUnitFromDistribution;

            if (safeHypotheticalExpectedUnits > 0 && (suggestedProfitPerUnit <= 0 || isNaN(suggestedProfitPerUnit) || !isFinite(suggestedProfitPerUnit))) {
                suggestedProfitPerUnit = safeHypotheticalCostPerUnit * 0.20;
                if (suggestedProfitPerUnit === 0 && safeHypotheticalCostPerUnit === 0) {
                    suggestedProfitPerUnit = 5;
                }
            } else if (safeHypotheticalExpectedUnits === 0) {
                suggestedProfitPerUnit = safeHypotheticalCostPerUnit > 0 ? (safeHypotheticalCostPerUnit * 0.05) : 1;
            }

            suggestedPrice = safeHypotheticalCostPerUnit + suggestedProfitPerUnit;
            suggestedPrice = Math.round(suggestedPrice * 100) / 100;

            const productRevenue = suggestedPrice * safeHypotheticalExpectedUnits;
            const thisProductFixedCostShare = fixedCostPerUnitFromDistribution * safeHypotheticalExpectedUnits;
            const productTotalCost = (safeHypotheticalCostPerUnit * safeHypotheticalExpectedUnits) + thisProductFixedCostShare;
            percentageRevenue = productRevenue > 0 ? ((productRevenue - productTotalCost) / productRevenue) * 100 : 0;
        }

        return {
            ...product, // Keep all original product properties
            hypotheticalExpectedUnits: safeHypotheticalExpectedUnits,
            hypotheticalCostPerUnit: safeHypotheticalCostPerUnit,
            hypotheticalPrice: suggestedPrice, // The new calculated price based on hypothetical inputs
            hypotheticalProfitPerUnit: suggestedProfitPerUnit,
            hypotheticalRevenueContribution: suggestedPrice * safeHypotheticalExpectedUnits,
        };
    });

    return {
        hypotheticalTotalRevenue: totalRevenueValue,
        hypotheticalCalculatedProfit: calculatedProfit,
        calculatedHypotheticalProducts,
    };
};


const BudgetTab = ({ totalRevenue, calculatedProfit, products, actualCost, loading, initialUseMargin, initialTargetProfit, initialTargetMargin }) => {
    const [clientBudget, setClientBudget] = useState(0);
    const [budgetStatus, setBudgetStatus] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('info');

    // State for hypothetical fixed costs and products
    const [hypotheticalFixedCost, setHypotheticalFixedCost] = useState(actualCost);
    const [hypotheticalProducts, setHypotheticalProducts] = useState(() => {
        // Initialize hypothetical products from props
        return Array.isArray(products) ? products.map(p => ({
            ...p,
            hypotheticalExpectedUnits: p.expectedUnits,
            hypotheticalCostPerUnit: p.costPerUnit,
            // Store original revenue_percentage as it's 0-1 for calculation
            revenue_percentage_original: (p.calculationMethod === 'percentage' && p.percentage) ? (parseFloat(p.percentage) / 100) : 0,
            hypotheticalPrice: p.price || 0, // Store current calculated price as a base
            hypotheticalProfitPerUnit: p.suggestedProfit || 0,
            hypotheticalRevenueContribution: (p.price || 0) * (p.expectedUnits || 0),
        })) : [];
    });

    // Derived hypothetical calculations
    const hypotheticalCalculationResults = useCallback(
        () => calculateHypotheticalPrices(
            hypotheticalFixedCost,
            hypotheticalProducts,
            initialUseMargin,
            initialTargetProfit,
            initialTargetMargin
        ),
        [hypotheticalFixedCost, hypotheticalProducts, initialUseMargin, initialTargetProfit, initialTargetMargin]
    );

    const { hypotheticalTotalRevenue, hypotheticalCalculatedProfit, calculatedHypotheticalProducts } = hypotheticalCalculationResults();

    // Calculate total variable costs from hypothetical products
    const totalHypotheticalVariableCosts = calculatedHypotheticalProducts.reduce((sum, product) => {
        const productVariableCost = (product.hypotheticalCostPerUnit || 0) * (product.hypotheticalExpectedUnits || 0);
        return sum + productVariableCost;
    }, 0);

    // Calculate total direct costs from hypothetical products (direct costs are not hypothetical for now, but linked to original products)
    const totalHypotheticalDirectCosts = calculatedHypotheticalProducts.reduce((sum, product) => {
        const productDirectCosts = (product.directCosts || []).reduce((dcSum, dc) => dcSum + (dc.amount || 0), 0);
        return sum + productDirectCosts;
    }, 0);

    // Calculate the total of all costs (hypothetical fixed + hypothetical variable + hypothetical direct)
    const grandTotalHypotheticalCosts = hypotheticalFixedCost + totalHypotheticalVariableCosts + totalHypotheticalDirectCosts;


    // Effect to update hypothetical values when initial props change (e.g., when tab is opened or Setup/Products change)
    useEffect(() => {
        setHypotheticalFixedCost(actualCost);
        setHypotheticalProducts(Array.isArray(products) ? products.map(p => ({
            ...p,
            hypotheticalExpectedUnits: p.expectedUnits,
            hypotheticalCostPerUnit: p.costPerUnit,
            revenue_percentage_original: (p.calculationMethod === 'percentage' && p.percentage) ? (parseFloat(p.percentage) / 100) : 0,
            hypotheticalPrice: p.price || 0,
            hypotheticalProfitPerUnit: p.suggestedProfit || 0,
            hypotheticalRevenueContribution: (p.price || 0) * (p.expectedUnits || 0),
        })) : []);
        setClientBudget(0); // Reset client budget on prop change
    }, [actualCost, products]); // Only re-initialize when actualCost or product structure changes


    // Effect to recalculate budget status and suggestions
    useEffect(() => {
        if (clientBudget > 0) {
            const difference = clientBudget - hypotheticalTotalRevenue;
            if (difference >= 0) {
                setBudgetStatus(`With hypothetical changes, the quotation total is within the client's budget! You have R${difference.toFixed(2)} remaining.`);
                setAlertSeverity('success');
            } else {
                const percentageOverBudget = hypotheticalTotalRevenue > 0 ? ((Math.abs(difference) / hypotheticalTotalRevenue) * 100).toFixed(2) : '0.00';
                setBudgetStatus(
                    `With hypothetical changes, the quotation total exceeds the client's budget by R${Math.abs(difference).toFixed(2)} (${percentageOverBudget}% over budget). ` +
                    `Consider adjusting hypothetical inputs further or revisit pricing strategy.`
                );
                setAlertSeverity('error');
            }
        } else {
            setBudgetStatus("Enter the client's budget above to compare with the hypothetical quotation totals.");
            setAlertSeverity('info');
        }
    }, [clientBudget, hypotheticalTotalRevenue, hypotheticalCalculatedProfit]);


    const handleHypotheticalFixedCostChange = (e) => {
        setHypotheticalFixedCost(parseFloat(e.target.value) || 0);
    };

    const handleHypotheticalProductChange = (index, field, value) => {
        const newProducts = [...hypotheticalProducts];
        newProducts[index][field] = value;
        setHypotheticalProducts(newProducts);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%', maxWidth: '800px' }}
        >
            <Card elevation={3} sx={{ mb: 4, width: '100%' }}>
                <CardContent>
                    <Typography variant="h5" align="center" gutterBottom sx={{ mb: 3, color: 'text.primary' }}>
                        Budget What-If Analysis
                    </Typography>

                    <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
                        <TextField
                            label="Client's Budget (R)"
                            type="number"
                            value={clientBudget === 0 ? '' : clientBudget.toString().replace(/^0+/, '')}
                            onChange={(e) => setClientBudget(parseFloat(e.target.value) || 0)}
                            fullWidth
                            disabled={loading}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">R</InputAdornment>,
                            }}
                            sx={{ maxWidth: '80%', mb: 2 }}
                        />

                        <Alert severity="info" sx={{ width: '100%', maxWidth: '80%', mt: 2 }}>
                            These calculations are hypothetical for budget planning and do not affect the main pricing.
                        </Alert>

                        <Typography variant="h6" align="center" gutterBottom sx={{ mt: 4, color: 'text.primary' }}>
                            Hypothetical Fixed Costs
                        </Typography>
                        <TextField
                            label="Hypothetical Total Monthly Fixed Cost (R)"
                            type="number"
                            value={hypotheticalFixedCost === 0 ? '' : hypotheticalFixedCost.toString().replace(/^0+/, '')}
                            onChange={handleHypotheticalFixedCostChange}
                            fullWidth
                            disabled={loading}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">R</InputAdornment>,
                            }}
                            sx={{ maxWidth: '80%', mb: 2 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            Original Fixed Cost: R{actualCost.toFixed(2)}
                        </Typography>

                        <Typography variant="h6" align="center" gutterBottom sx={{ mt: 4, color: 'text.primary' }}>
                            Hypothetical Product Adjustments
                        </Typography>

                        {calculatedHypotheticalProducts.length === 0 ? (
                            <Alert severity="warning" sx={{ width: '100%', maxWidth: '80%', mt: 2 }}>
                                No products defined. Please add products on the "Products" tab to use this feature.
                            </Alert>
                        ) : (
                            <Grid container spacing={2} sx={{ maxWidth: '100%', width: '100%' }}>
                                {calculatedHypotheticalProducts.map((product, index) => (
                                    <Grid item xs={12} key={product.id || index}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="subtitle1" fontWeight="bold">{product.name}</Typography>
                                                <Grid container spacing={2} alignItems="center">
                                                    <Grid item xs={12} sm={4}>
                                                        <TextField
                                                            fullWidth
                                                            label="Hypothetical Units"
                                                            type="number"
                                                            value={product.hypotheticalExpectedUnits === 0 ? '' : product.hypotheticalExpectedUnits.toString().replace(/^0+/, '')}
                                                            onChange={(e) => handleHypotheticalProductChange(index, 'hypotheticalExpectedUnits', parseFloat(e.target.value) || 0)}
                                                            inputProps={{ min: 0 }}
                                                            disabled={loading}
                                                        />
                                                        <Typography variant="caption" color="text.secondary">
                                                            Original: {product.expectedUnits} units
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={4}>
                                                        <TextField
                                                            fullWidth
                                                            label="Hypothetical Cost/Unit (R)"
                                                            type="number"
                                                            value={product.hypotheticalCostPerUnit === 0 ? '' : product.hypotheticalCostPerUnit.toString().replace(/^0+/, '')}
                                                            onChange={(e) => handleHypotheticalProductChange(index, 'hypotheticalCostPerUnit', parseFloat(e.target.value) || 0)}
                                                            inputProps={{ min: 0 }}
                                                            disabled={loading}
                                                            InputProps={{
                                                                startAdornment: <InputAdornment position="start">R</InputAdornment>,
                                                            }}
                                                        />
                                                        <Typography variant="caption" color="text.secondary">
                                                            Original: R{product.costPerUnit.toFixed(2)}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={4}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Hypothetical Price: R{product.hypotheticalPrice?.toFixed(2) || '0.00'}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Hypothetical Profit/Unit: R{product.hypotheticalProfitPerUnit?.toFixed(2) || '0.00'}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Hypothetical Revenue Contribution: R{product.hypotheticalRevenueContribution?.toFixed(2) || '0.00'}
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        )}


                        <Typography variant="h6" align="center" gutterBottom sx={{ mt: 4, color: 'text.primary' }}>
                            Hypothetical Quotation Summary
                        </Typography>
                        <TableContainer component={Paper} sx={{ maxWidth: '90%', mb: 2 }}>
                            <Table size="small" aria-label="hypothetical cost breakdown table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Cost Category</TableCell>
                                        <TableCell align="right">Amount (R)</TableCell>
                                        <TableCell align="right">% of Hypothetical Revenue</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell component="th" scope="row">Hypothetical Fixed Costs</TableCell>
                                        <TableCell align="right">R {hypotheticalFixedCost.toFixed(2)}</TableCell>
                                        <TableCell align="right">
                                            {hypotheticalTotalRevenue > 0 ? ((hypotheticalFixedCost / hypotheticalTotalRevenue) * 100).toFixed(2) : '0.00'}%
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th" scope="row">Hypothetical Variable Product Costs</TableCell>
                                        <TableCell align="right">R {totalHypotheticalVariableCosts.toFixed(2)}</TableCell>
                                        <TableCell align="right">
                                            {hypotheticalTotalRevenue > 0 ? ((totalHypotheticalVariableCosts / hypotheticalTotalRevenue) * 100).toFixed(2) : '0.00'}%
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th" scope="row">Original Direct Product Costs</TableCell>
                                        <TableCell align="right">R {totalHypotheticalDirectCosts.toFixed(2)}</TableCell>
                                        <TableCell align="right">
                                            {hypotheticalTotalRevenue > 0 ? ((totalHypotheticalDirectCosts / hypotheticalTotalRevenue) * 100).toFixed(2) : '0.00'}%
                                        </TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Total Hypothetical Costs</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>R {grandTotalHypotheticalCosts.toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                            {hypotheticalTotalRevenue > 0 ? ((grandTotalHypotheticalCosts / hypotheticalTotalRevenue) * 100).toFixed(2) : '0.00'}%
                                        </TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0, borderTop: '2px solid #CC7722' } }}>
                                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Hypothetical Calculated Profit</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>R {hypotheticalCalculatedProfit.toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                            {hypotheticalTotalRevenue > 0 ? ((hypotheticalCalculatedProfit / hypotheticalTotalRevenue) * 100).toFixed(2) : '0.00'}%
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Typography variant="h6" align="center" gutterBottom sx={{ mt: 4, color: 'text.primary' }}>
                            Overall Hypothetical Quotation Comparison
                        </Typography>
                        <TableContainer component={Paper} sx={{ maxWidth: '90%', mb: 2 }}>
                            <Table size="small" aria-label="overall hypothetical comparison table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Metric</TableCell>
                                        <TableCell align="right">Original (R)</TableCell>
                                        <TableCell align="right">Hypothetical (R)</TableCell>
                                        <TableCell align="right">Change (R)</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Total Revenue</TableCell>
                                        <TableCell align="right">R {totalRevenue.toFixed(2)}</TableCell>
                                        <TableCell align="right">R {hypotheticalTotalRevenue.toFixed(2)}</TableCell>
                                        <TableCell align="right">R {(hypotheticalTotalRevenue - totalRevenue).toFixed(2)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Calculated Profit</TableCell>
                                        <TableCell align="right">R {calculatedProfit.toFixed(2)}</TableCell>
                                        <TableCell align="right">R {hypotheticalCalculatedProfit.toFixed(2)}</TableCell>
                                        <TableCell align="right">R {(hypotheticalCalculatedProfit - calculatedProfit).toFixed(2)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {clientBudget > 0 && hypotheticalTotalRevenue > clientBudget && (
                            <Alert severity="warning" sx={{ width: '100%', maxWidth: '80%', mt: 2 }}>
                                **Actionable Insight:** The hypothetical quotation total (R{hypotheticalTotalRevenue.toFixed(2)}) still exceeds the client's budget (R{clientBudget.toFixed(2)}) by R{(hypotheticalTotalRevenue - clientBudget).toFixed(2)}.
                                To fit within this budget with your current hypothetical changes, you would need to find ways to reduce total costs or further adjust pricing/quantities to lower the revenue required.
                                Consider:
                                <ul>
                                    <li>Reducing your target profit/margin.</li>
                                    <li>Negotiating lower base costs for products.</li>
                                    <li>Optimizing expected units to better utilize fixed costs.</li>
                                </ul>
                            </Alert>
                        )}
                         {clientBudget > 0 && hypotheticalTotalRevenue < clientBudget && (
                            <Alert severity="info" sx={{ width: '100%', maxWidth: '80%', mt: 2 }}>
                                **Positive Insight:** Your hypothetical changes result in a quotation total (R{hypotheticalTotalRevenue.toFixed(2)}) that is within the client's budget (R{clientBudget.toFixed(2)}).
                                You have R{(clientBudget - hypotheticalTotalRevenue).toFixed(2)} remaining. You could potentially:
                                <ul>
                                    <li>Increase your target profit slightly.</li>
                                    <li>Offer higher quality materials or additional services within the budget.</li>
                                </ul>
                            </Alert>
                        )}

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
                            Use this tab to perform "what-if" analysis on your budget and cost allocations by adjusting hypothetical fixed costs, product units, and product variable costs.
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default BudgetTab;
