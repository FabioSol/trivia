package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/FabioSol/fuego/core"
	"github.com/FabioSol/fuego/engine"
)

type gameConfig struct {
	VisibleCategories []string `json:"visible_categories"`
}

func main() {
	eng := engine.New()

	visible, err := loadVisibleCategories("public/game-config.json")
	if err == nil && len(visible) > 0 {
		eng.AfterParse(func(pages []*core.Page) ([]*core.Page, error) {
			var filtered []*core.Page
			for _, p := range pages {
				cat, _ := p.Envelope["category"].(string)
				if cat == "" || visible[strings.ToLower(cat)] {
					filtered = append(filtered, p)
				}
			}
			return filtered, nil
		})
	}

	if err := eng.Run(os.Args); err != nil {
		fmt.Fprintf(os.Stderr, "fuego: %v\n", err)
		os.Exit(1)
	}
}

func loadVisibleCategories(path string) (map[string]bool, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg gameConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	m := make(map[string]bool, len(cfg.VisibleCategories))
	for _, c := range cfg.VisibleCategories {
		m[strings.ToLower(c)] = true
	}
	return m, nil
}
