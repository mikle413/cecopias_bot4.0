const categorias = [
    { keyword: /mercado|supermercado|feira/i, categoria: 'Alimentação' },
    { keyword: /uber|99|taxi|app/i, categoria: 'Transporte' },
    { keyword: /aluguel|condomínio|imóvel/i, categoria: 'Moradia' },
    { keyword: /farmácia|remédio|saúde/i, categoria: 'Saúde' },
    { keyword: /escola|curso|faculdade|livro/i, categoria: 'Educação' },
    { keyword: /luz|energia|água|internet|telefone/i, categoria: 'Contas' },
    { keyword: /salário|renda|receita|ganho|venda/i, categoria: 'Receitas' },
    // Adicione mais padrões
];

function autoCategorize(descricao) {
    for (const cat of categorias) {
        if (cat.keyword.test(descricao)) return cat.categoria;
    }
    return 'Outros';
}

module.exports = { autoCategorize };
