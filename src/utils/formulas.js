export class Formulas {

    static calculateLinearValue(formula, x) {
        return formula.B + formula.A * x;
    }

    static calculateExponentialValue(formula, x) {
        return formula.B*Math.pow(formula.A, x);
    }

    static calculateValue(formula, x) {
        if(formula.type === 0) {
            return Formulas.calculateLinearValue(formula, x)
        } else if(formula.type === 1) {
            return Formulas.calculateExponentialValue(formula, x)
        }
    }

}