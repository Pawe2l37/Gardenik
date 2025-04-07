import yaml

def parse_markdown_to_yaml(markdown_file, yaml_file):
    with open(markdown_file, 'r', encoding='utf-8') as md_file:
        lines = md_file.readlines()

    questions = []
    current_question = None

    for line in lines:
        line = line.strip()
        if line.startswith('-'):
            if current_question:
                questions.append(current_question)
            parts = line.split('**')
            if len(parts) > 1:
                key_parts = parts[0].split()
                if len(key_parts) > 1:
                    current_question = {
                        'key': key_parts[1],
                        'question': parts[1],
                        'type': 'choice' if 'choice' in line else 'open',
                        'choices': []
                    }
                else:
                    current_question = {
                        'key': key_parts[0],
                        'question': parts[1],
                        'type': 'choice' if 'choice' in line else 'open',
                        'choices': []
                    }
            else:
                current_question = {
                    'key': parts[0].split()[0],
                    'question': parts[0].split()[0],
                    'type': 'choice' if 'choice' in line else 'open',
                    'choices': []
                }
        elif line.startswith('    -'):
            if current_question:
                current_question['choices'].append(line.split('- ')[1])

    if current_question:
        questions.append(current_question)

    with open(yaml_file, 'w', encoding='utf-8') as yf:
        yaml.dump({'questions': questions}, yf, allow_unicode=True)

# Example usage
parse_markdown_to_yaml('infoDiagram.md', 'questionsStructure.yaml')
